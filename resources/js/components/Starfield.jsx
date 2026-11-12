import React, { useEffect, useRef } from 'react';

export function Starfield() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    let isRunning = true;
    
    let mouse = { x: null, y: null, radius: 100 };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const handleMouseMove = (event) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };

    const handleMouseOut = () => {
      mouse.x = null;
      mouse.y = null;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isRunning = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
      } else {
        isRunning = true;
        animate();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 1.5 + 0.5;
        this.baseX = this.x;
        this.baseY = this.y;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = (Math.random() - 0.5) * 0.4;
        this.color = `rgba(255, 255, 255, ${Math.random() * 0.6 + 0.2})`;
      }
      
      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < 0) this.x = canvas.width;
        else if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        else if (this.y > canvas.height) this.y = 0;

        if (mouse.x != null && mouse.y != null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0 && dist < mouse.radius) {
            const force = (mouse.radius - dist) / mouse.radius;
            this.x -= (dx / dist) * force * 2;
            this.y -= (dy / dist) * force * 2;
          }
        }
      }
    }

    const initParticles = () => {
      particles = [];
      // Keep particle count light and memory-safe (capped at 40 max)
      const count = Math.min(40, Math.max(15, Math.floor((canvas.width * canvas.height) / 35000)));
      for (let i = 0; i < count; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      if (!isRunning) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
      }

      // Batch connect lines in a single path for high performance & zero memory leak
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      
      const maxDistSq = 90 * 90;
      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x;
          const dy = particles[a].y - particles[b].y;
          const distSq = dx * dx + dy * dy;
          if (distSq < maxDistSq) {
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
          }
        }
      }
      ctx.stroke();

      animationFrameId = requestAnimationFrame(animate);
    };

    handleResize();
    animate();

    return () => {
      isRunning = false;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
    />
  );
}
