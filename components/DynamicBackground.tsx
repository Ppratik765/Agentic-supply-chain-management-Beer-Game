'use client';

import React, { useEffect, useRef } from 'react';

interface Node {
  id: number;
  x: number;
  y: number;
  label: string;
}

interface Path {
  from: Node;
  to: Node;
}

interface Shipment {
  path: Path;
  progress: number; // 0 to 1
  speed: number;
  size: number;
  color: string;
}

interface WireframeBox {
  x: number;
  y: number;
  z: number;
  size: number;
  rx: number; // rotation x
  ry: number; // rotation y
  rz: number; // rotation z
  vx: number;
  vy: number;
  vrx: number; // rotation speed x
  vry: number; // rotation speed y
  vrz: number; // rotation speed z
}

export default function DynamicBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // ─── Supply Chain Nodes ──────────────────────────────────────────────────
    // Stationary or slowly oscillating nodes representing supply chain hubs
    const nodes: Node[] = [
      { id: 1, x: width * 0.15, y: height * 0.25, label: 'Factory Hub' },
      { id: 2, x: width * 0.45, y: height * 0.15, label: 'Distributor Node' },
      { id: 3, x: width * 0.75, y: height * 0.35, label: 'Wholesale Depot' },
      { id: 4, x: width * 0.35, y: height * 0.75, label: 'Retail Outlet' },
      { id: 5, x: width * 0.85, y: height * 0.8, label: 'End Market' },
    ];

    // Define paths between nodes
    const paths: Path[] = [
      { from: nodes[0], to: nodes[1] },
      { from: nodes[1], to: nodes[2] },
      { from: nodes[2], to: nodes[3] },
      { from: nodes[3], to: nodes[4] },
      { from: nodes[0], to: nodes[3] },
      { from: nodes[2], to: nodes[4] },
    ];

    // Active shipments traveling along paths (representing trucks)
    const shipments: Shipment[] = [];
    const maxShipments = 12;

    function spawnShipment() {
      if (shipments.length >= maxShipments) return;
      const path = paths[Math.floor(Math.random() * paths.length)];
      const isDark = document.documentElement.classList.contains('dark');
      const colors = isDark
        ? ['#22d3ee', '#a78bfa', '#fbbf24', '#34d399']
        : ['#2b5c8f', '#386641', '#7a528a', '#9c5a3c'];
      shipments.push({
        path,
        progress: 0,
        speed: 0.001 + Math.random() * 0.002,
        size: 3 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    // Initialize some shipments
    for (let i = 0; i < 6; i++) {
      spawnShipment();
      shipments[i].progress = Math.random();
    }

    // ─── Floating Wireframe Boxes ────────────────────────────────────────────
    const boxes: WireframeBox[] = [];
    const numBoxes = 15;

    for (let i = 0; i < numBoxes; i++) {
      boxes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: 100 + Math.random() * 300,
        size: 30 + Math.random() * 40,
        rx: Math.random() * Math.PI * 2,
        ry: Math.random() * Math.PI * 2,
        rz: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        vrx: (Math.random() - 0.5) * 0.003,
        vry: (Math.random() - 0.5) * 0.003,
        vrz: (Math.random() - 0.5) * 0.003,
      });
    }

    // Project 3D vertices to 2D
    const project = (x: number, y: number, z: number, boxX: number, boxY: number) => {
      const fov = 400;
      const scale = fov / (fov + z);
      return {
        x: boxX + x * scale,
        y: boxY + y * scale,
      };
    };

    // Rotate point in 3D space
    const rotateX = (y: number, z: number, angle: number) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return [y * cos - z * sin, y * sin + z * cos];
    };

    const rotateY = (x: number, z: number, angle: number) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return [x * cos + z * sin, -x * sin + z * cos];
    };

    const rotateZ = (x: number, y: number, angle: number) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return [x * cos - y * sin, x * sin + y * cos];
    };

    // Draw a single wireframe box
    const drawBox = (ctx: CanvasRenderingContext2D, box: WireframeBox, isDark: boolean) => {
      const s = box.size / 2;
      // 8 Vertices of a cube
      let vertices = [
        [-s, -s, -s],
        [s, -s, -s],
        [s, s, -s],
        [-s, s, -s],
        [-s, -s, s],
        [s, -s, s],
        [s, s, s],
        [-s, s, s],
      ];

      // Apply 3D rotations
      vertices = vertices.map(([px, py, pz]) => {
        let [x, z] = rotateY(px, pz, box.ry);
        let [y, nz] = rotateX(py, z, box.rx);
        let [nx, ny] = rotateZ(x, y, box.rz);
        return [nx, ny, nz];
      });

      // Project vertices to 2D
      const pts = vertices.map(([px, py, pz]) => project(px, py, pz, box.x, box.y));

      // Define 12 Edges
      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0], // Back face
        [4, 5], [5, 6], [6, 7], [7, 4], // Front face
        [0, 4], [1, 5], [2, 6], [3, 7], // Connecting edges
      ];

      // Draw Edges
      ctx.beginPath();
      edges.forEach(([p1, p2]) => {
        ctx.moveTo(pts[p1].x, pts[p1].y);
        ctx.lineTo(pts[p2].x, pts[p2].y);
      });

      // Subtle wireframe color based on depth
      const alpha = Math.max(0.01, 0.15 - box.z / 600);
      ctx.strokeStyle = isDark
        ? `rgba(255, 87, 34, ${alpha * 1.2})`
        : `rgba(96, 108, 56, ${alpha * 1.5})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    // ─── Main Animation Loop ────────────────────────────────────────────────
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const isDark = document.documentElement.classList.contains('dark');
      const gridColor = isDark ? 'rgba(255, 87, 34, 0.03)' : 'rgba(96, 108, 56, 0.05)';
      const pathColor = isDark ? 'rgba(255, 87, 34, 0.1)' : 'rgba(96, 108, 56, 0.12)';
      const nodeStrokeColor = isDark ? 'rgba(255, 87, 34, 0.4)' : 'rgba(96, 108, 56, 0.4)';
      const nodeFillColor = isDark ? 'rgba(255, 51, 51, 0.15)' : 'rgba(212, 163, 115, 0.2)';
      const nodeLabelColor = isDark ? 'rgba(255, 87, 34, 0.4)' : 'rgba(96, 108, 56, 0.55)';

      // 1. Draw grid layout background
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Draw Paths between Hubs
      ctx.strokeStyle = pathColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      paths.forEach((path) => {
        ctx.beginPath();
        ctx.moveTo(path.from.x, path.from.y);
        ctx.lineTo(path.to.x, path.to.y);
        ctx.stroke();
      });
      ctx.setLineDash([]); // Reset line dash

      // 3. Draw Nodes (Hubs)
      nodes.forEach((node, index) => {
        // Slowly rotate nodes
        const rotation = (Date.now() * 0.0005 + index * (Math.PI / 4)) % (Math.PI * 2);
        ctx.save();
        ctx.translate(node.x, node.y);
        ctx.rotate(rotation);

        // Draw outer diamond
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(6, 0);
        ctx.lineTo(0, 6);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.strokeStyle = nodeStrokeColor;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Inner glowing core
        ctx.fillStyle = nodeFillColor;
        ctx.fill();
        ctx.restore();

        ctx.font = '9px monospace';
        ctx.fillStyle = nodeLabelColor;
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y - 12);
      });

      // 4. Update and Draw Shipments (Glow Streaks)
      if (Math.random() < 0.02) spawnShipment();

      for (let i = shipments.length - 1; i >= 0; i--) {
        const s = shipments[i];
        s.progress += s.speed;

        if (s.progress >= 1) {
          shipments.splice(i, 1);
          continue;
        }

        // Interpolate position along the path
        const currentX = s.path.from.x + (s.path.to.x - s.path.from.x) * s.progress;
        const currentY = s.path.from.y + (s.path.to.y - s.path.from.y) * s.progress;

        // Calculate direction vector for drawing a linear pulse streak
        const dx = s.path.to.x - s.path.from.x;
        const dy = s.path.to.y - s.path.from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / dist;
        const uy = dy / dist;

        const streakLen = 22;
        const startX = currentX - ux * streakLen;
        const startY = currentY - uy * streakLen;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(currentX, currentY);

        const grad = ctx.createLinearGradient(startX, startY, currentX, currentY);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, s.color);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = isDark ? 8 : 4;
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadow
      }

      // 5. Update and Draw Floating Wireframe Boxes
      boxes.forEach((box) => {
        // Move
        box.x += box.vx;
        box.y += box.vy;

        // Wrap around boundaries
        if (box.x < -100) box.x = width + 100;
        if (box.x > width + 100) box.x = -100;
        if (box.y < -100) box.y = height + 100;
        if (box.y > height + 100) box.y = -100;

        // Rotate
        box.rx += box.vrx;
        box.ry += box.vry;
        box.rz += box.vrz;

        // Draw
        drawBox(ctx, box, isDark);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // ─── Window Resize Handler ───────────────────────────────────────────────
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;

      // Recalculate Node Positions on Resize
      nodes[0].x = width * 0.15; nodes[0].y = height * 0.25;
      nodes[1].x = width * 0.45; nodes[1].y = height * 0.15;
      nodes[2].x = width * 0.75; nodes[2].y = height * 0.35;
      nodes[3].x = width * 0.35; nodes[3].y = height * 0.75;
      nodes[4].x = width * 0.85; nodes[4].y = height * 0.8;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    />
  );
}
