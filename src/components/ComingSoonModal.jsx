export default function ComingSoonModal({ isOpen, onClose }) {
  const upcomingFeatures = [
    {
      name: 'Voice & Video Calls',
      description: 'Crystal clear peer-to-peer calling with audio and video',
      icon: '📞',
      eta: 'Q3 2026'
    },
    {
      name: 'Group Chats',
      description: 'Chat with multiple friends at once',
      icon: '👥',
      eta: 'Q3 2026'
    },
    {
      name: 'Exiting Featuress For D&S',
      description: 'Exiting new features to spiced up your conversation',
      icon: '😊',
      eta: 'Q3 2026'
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1e2330] rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#1e2330] border-b border-slate-700/50 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">🚀 Coming Soon</h2>
            <p className="text-slate-400 text-sm mt-1">Exciting features in development</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Features Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingFeatures.map((feature) => (
            <div
              key={feature.name}
              className="bg-[#252d3d] border border-slate-700/50 rounded-xl p-4 hover:border-indigo-500/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl flex-shrink-0">{feature.icon}</span>
                <div className="flex-1">
                  <h3 className="text-white font-semibold">{feature.name}</h3>
                  <p className="text-slate-400 text-sm mt-1">{feature.description}</p>
                  <div className="mt-3 inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                    ETA: {feature.eta}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#1e2330] border-t border-slate-700/50 px-6 py-4">
          <p className="text-slate-400 text-sm text-center">
            Have a feature request? We'd love to hear from you! 💡
          </p>
        </div>
      </div>
    </div>
  );
}
