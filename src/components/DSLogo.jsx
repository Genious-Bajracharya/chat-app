export default function DSLogo({ size = 40 }) {
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(79, 70, 229, 0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.4)';
      }}
    >
      {/* Chat bubble tail */}
      <div
        style={{
          position: 'absolute',
          bottom: '-4px',
          right: '2px',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderTop: `6px solid #4f46e5`,
        }}
      />
      {/* D&S text */}
      <span
        style={{
          color: 'white',
          fontWeight: 'bold',
          fontSize: `${size * 0.4}px`,
          letterSpacing: '-0.5px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        D&S
      </span>
    </div>
  );
}
