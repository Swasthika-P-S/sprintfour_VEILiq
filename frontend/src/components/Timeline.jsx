import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

export default function Timeline({ steps, currentStep }) {
  return (
    <div className="timeline-container" style={{ padding: '32px', background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)', maxWidth: 450, margin: '40px auto' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: 24, textAlign: 'center' }}>VEILiq is here for you!!</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          const isPending = index > currentStep;

          return (
            <motion.div 
              key={step.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15 }}
              style={{ display: 'flex', alignItems: 'center', gap: 16 }}
            >
              <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isCompleted ? (
                  <CheckCircle2 size={24} color="var(--primary)" />
                ) : isActive ? (
                  <Loader2 size={24} color="var(--primary)" className="spin-animation" />
                ) : (
                  <Circle size={24} color="var(--border-strong)" />
                )}
              </div>
              <span style={{ 
                fontSize: '1rem', 
                fontWeight: isActive || isCompleted ? 600 : 500, 
                color: isActive ? 'var(--primary)' : isCompleted ? 'var(--text-dark)' : 'var(--text-faint)' 
              }}>
                {step.label}
              </span>
            </motion.div>
          );
        })}
      </div>
      <style>{`
        .spin-animation { animation: spin 1.5s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
