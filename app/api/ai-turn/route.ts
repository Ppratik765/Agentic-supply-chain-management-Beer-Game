import { getRoom } from '@/lib/game-store';
import { calculateERPAgentOrder } from '@/lib/supply-chain-engine';
import type { AITurnRequest } from '@/types';
import { ROLE_META } from '@/types';

// LangGraph & LangChain Imports
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

// 1. Define the Graph State
// This object holds the data as it flows through our multi-agent board
const GraphState = Annotation.Root({
  roleName: Annotation<string>(),
  inventory: Annotation<number>(),
  backlog: Annotation<number>(),
  demand: Annotation<number>(),
  erpOrder: Annotation<number>(),
  riskAnalysis: Annotation<string>(),
  financeAnalysis: Annotation<string>(),
  finalRecommendation: Annotation<string>(),
});

// 2. Initialize the Lightweight Model (Gemini Flash Lite is incredibly fast)
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3.1-flash-lite",
  maxOutputTokens: 50,
  temperature: 0.2, // Low temp for analytical consistency
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body: AITurnRequest = await request.json();
    const { roomCode, role, mode } = body;

    if (!roomCode || !role || !mode) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const gameState = await getRoom(roomCode);
    if (!gameState) {
      return Response.json({ error: 'Room not found' }, { status: 404 });
    }

    const roleState = gameState.roles[role];
    const erpOrder = calculateERPAgentOrder(role, gameState);

    if (mode === 'auto-order') {
      return Response.json({
        orderQuantity: erpOrder,
        reasoning: `ERP Heuristic processed.`,
      });
    }

    if (mode === 'help') {
      const roleMeta = ROLE_META[role];

      // ─── 3. Define the Agents (Graph Nodes) ──────────────────────────────

      // Node A: The Risk Analyst
      const riskNode = async (state: typeof GraphState.State) => {
        const prompt = `You are the Risk Analyst for the ${state.roleName}. 
        Inventory: ${state.inventory}, Backlog: ${state.backlog}, Demand: ${state.demand}.
        In one very short sentence, argue why we must secure enough stock to prevent backlogs and customer dissatisfaction.`;

        const res = await llm.invoke([new HumanMessage(prompt)]);
        return { riskAnalysis: res.content as string };
      };

      // Node B: The Finance Controller
      const financeNode = async (state: typeof GraphState.State) => {
        const prompt = `You are the Finance Controller for the ${state.roleName}. 
        Inventory: ${state.inventory}, Backlog: ${state.backlog}, Demand: ${state.demand}.
        In one very short sentence, argue why we must keep inventory lean to avoid massive warehousing holding costs.`;

        const res = await llm.invoke([new HumanMessage(prompt)]);
        return { financeAnalysis: res.content as string };
      };

      // Node C: The Supply Chain Director (Synthesizer)
      const directorNode = async (state: typeof GraphState.State) => {
        const prompt = `You are the Supply Chain Director. You must make the final decision.
        Risk Analyst says: "${state.riskAnalysis}"
        Finance Controller says: "${state.financeAnalysis}"
        The deterministic ERP algorithm requires an order of exactly: ${state.erpOrder} units.

        Write a 1 to 2 sentence final recommendation for the human player. 
        You MUST explicitly recommend ordering ${state.erpOrder} units by balancing the risk and finance arguments. Keep it under 25 words. No markdown formatting.`;

        const res = await llm.invoke([
          new SystemMessage("You are a strict, concise logistics director."),
          new HumanMessage(prompt)
        ]);
        return { finalRecommendation: res.content as string };
      };

      // ─── 4. Build and Compile the LangGraph ──────────────────────────────
      const workflow = new StateGraph(GraphState)
        .addNode("risk", riskNode)
        .addNode("finance", financeNode)
        .addNode("director", directorNode)
        // Parallel execution: Start hits both Risk and Finance at the same time for speed
        .addEdge(START, "risk")
        .addEdge(START, "finance")
        // Both must finish before the Director can synthesize (fan-in join)
        .addEdge(["risk", "finance"], "director")
        .addEdge("director", END);

      const app = workflow.compile();

      // ─── 5. Execute the Multi-Agent Graph ────────────────────────────────
      try {
        const finalState = await app.invoke({
          roleName: roleMeta.label,
          inventory: roleState.inventory,
          backlog: roleState.backlog,
          demand: roleState.incomingOrder,
          erpOrder: erpOrder,
        });

        return Response.json({
          recommendation: finalState.finalRecommendation,
          orderQuantity: erpOrder,
        });
      } catch (aiError) {
        console.error('LangGraph Execution Error:', aiError);
        return Response.json({
          recommendation: `Order ${erpOrder} units to balance demand and safety stock limits.`,
          orderQuantity: erpOrder,
        });
      }
    }

    return Response.json({ error: 'Invalid mode.' }, { status: 400 });
  } catch (error) {
    console.error('AI turn error:', error);
    return Response.json({ error: 'Failed to process AI turn' }, { status: 500 });
  }
}