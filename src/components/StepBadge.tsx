interface StepBadgeProps {
  number: number;
}

export function StepBadge({ number }: StepBadgeProps) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 48, height: 48 }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'linear-gradient(140deg, rgba(59,130,246,0.20), rgba(168,85,247,0.20))',
          filter: 'blur(8px)',
        }}
      />
      <div
        className="relative flex items-center justify-center rounded-full shadow-lg"
        style={{
          width: 40,
          height: 40,
          background: 'linear-gradient(140deg, rgba(59,130,246,1), rgba(147,51,234,1))',
        }}
      >
        <span className="font-semibold text-white">{number}</span>
      </div>
    </div>
  );
}
