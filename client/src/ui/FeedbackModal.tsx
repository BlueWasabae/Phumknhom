import React, { useState } from 'react';
import type { PlayerState } from '@shared/types';
import { Bug, CheckCircle2, Lightbulb, Send } from 'lucide-react';
import { submitFeedbackApi, type AuthSession } from '../game/network/ApiClient';
import { soundManager } from '../game/systems/SoundManager';
import { NativeDialog } from './NativeDialog';

interface FeedbackModalProps {
  open: boolean;
  player: PlayerState;
  authSession: AuthSession | null;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  open,
  player,
  authSession,
  onClose,
  onToast,
}) => {
  const [category, setCategory] = useState<'bug' | 'idea' | 'balance' | 'other'>('bug');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErrorMsg(null);
    if (title.trim().length < 3) {
      setErrorMsg('Please enter a short summary title (3+ characters).');
      return;
    }
    if (message.trim().length < 5) {
      setErrorMsg('Please describe the bug or suggestion (5+ characters).');
      return;
    }
    setBusy(true);
    const res = await submitFeedbackApi(authSession, {
      username: player.name,
      category,
      title: title.trim(),
      message: message.trim(),
      mapId: player.currentMapId ?? player.zone,
      appVersion: '3.0.0',
    });
    setBusy(false);
    if (!res.ok) {
      setErrorMsg(res.error);
      return;
    }
    soundManager.playSfx('victory');
    setSubmitted(true);
    setTitle('');
    setMessage('');
    onToast('🙏 Thank you! Your report was delivered to the Phum Khnhom GM Dashboard!');
  };

  return (
    <NativeDialog
      open={open}
      onClose={() => {
        setSubmitted(false);
        setErrorMsg(null);
        onClose();
      }}
      title="🐛 Report Bug / Send Feedback"
      subtitle={`Logged as ${player.name} · Map: ${player.currentMapId ?? player.zone} · v3.0.0`}
      maxWidthClass="max-w-lg"
    >
      {submitted ? (
        <div className="space-y-3 py-4 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <div className="font-display text-base font-black text-amber-950">
            Report Received — Orkun Chraen! (អរគុណច្រើន)
          </div>
          <p className="text-xs text-amber-900">
            Your feedback has been logged directly to the Founder GM Panel so we can fix bugs and build features
            requested by the community.
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              onClose();
            }}
            className="phum-btn px-5 py-2 rounded-xl font-display font-bold text-xs cursor-pointer"
          >
            Back to Village
          </button>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 text-xs">
          {errorMsg && (
            <div className="rounded-xl border border-rose-500 bg-rose-100 p-2 font-bold text-rose-900">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-4 gap-1.5">
            {(
              [
                ['bug', '🐛 Bug', Bug],
                ['idea', '💡 Idea', Lightbulb],
                ['balance', '⚖️ Balance', Lightbulb],
                ['other', '💬 Other', Send],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setCategory(id)}
                className={`rounded-xl border-2 py-1.5 font-display font-bold text-[11px] transition cursor-pointer ${
                  category === id
                    ? 'border-amber-950 bg-amber-800 text-amber-50'
                    : 'border-amber-900/25 bg-amber-50 text-amber-950 hover:bg-amber-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <label className="block font-display font-bold text-amber-950">Short Title</label>
            <input
              type="text"
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Floating lotus lantern near Green Park pier"
              className="w-full rounded-xl border-2 border-amber-900/30 bg-white px-3 py-2 text-xs font-semibold text-amber-950 focus:border-amber-700 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-display font-bold text-amber-950">Details</label>
            <textarea
              rows={4}
              maxLength={800}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what happened or share your feature idea for Phum Khnhom..."
              className="w-full rounded-xl border-2 border-amber-900/30 bg-white px-3 py-2 text-xs font-semibold text-amber-950 focus:border-amber-700 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-amber-900/30 bg-amber-100 px-3.5 py-2 font-display font-bold text-amber-950 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="phum-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2 font-display font-black text-xs disabled:opacity-50 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              {busy ? 'Sending...' : 'Submit Report'}
            </button>
          </div>
        </form>
      )}
    </NativeDialog>
  );
};
