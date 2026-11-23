import React, { useEffect, useRef, useState } from 'react';
import {
  INITIAL_PLAYER_STATE,
  type ChatMessage,
  type CombatHitResult,
  type PlayerState,
  type ZoneType,
} from '@shared/types';
import { launchPhaserGame } from './game/config';
import { EventBus } from './game/EventBus';
import { HUD } from './ui/HUD';
import { ChatOverlay } from './ui/ChatOverlay';
import { MobileControls } from './ui/MobileControls';

export const App: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  const [player, setPlayer] = useState<PlayerState>({
    ...INITIAL_PLAYER_STATE,
    weapon: { ...INITIAL_PLAYER_STATE.weapon },
  });
  const [zone, setZone] = useState<ZoneType>('overworld');
  const [nearPortal, setNearPortal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [touchUiEnabled, setTouchUiEnabled] = useState(false);
  const [lastHit, setLastHit] = useState<CombatHitResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'sys-welcome',
      sender: 'Phum Guide',
      text: 'Welcome to ភូមិខ្ញុំ! Walk top-right to the Cave Portal and press E.',
      timestamp: Date.now(),
    },
  ]);

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) setTouchUiEnabled(true);
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    const { destroy } = launchPhaserGame(mountRef.current);

    let toastTimer: number | null = null;
    const unsubs = [
      EventBus.on('scene:ready', ({ zone: nextZone }) => {
        setZone(nextZone);
        setNearPortal(false);
      }),
      EventBus.on('player:state', (nextPlayer) => {
        setPlayer(nextPlayer);
      }),
      EventBus.on('portal:proximity', ({ nearPortal: near }) => {
        setNearPortal(near);
      }),
      EventBus.on('combat:hit', ({ hit }) => {
        setLastHit(hit);
      }),
      EventBus.on('ui:toast', ({ text }) => {
        setToast(text);
        if (toastTimer) window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => setToast(null), 3200);
      }),
    ];

    return () => {
      if (toastTimer) window.clearTimeout(toastTimer);
      unsubs.forEach((u) => u());
      destroy();
    };
  }, []);

  return (
    <div className="relative w-screen h-dvh max-w-full max-h-dvh overflow-hidden bg-slate-950">
      <div ref={mountRef} className="w-full h-full overflow-hidden" />

      <HUD
        player={player}
        zone={zone}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen((o) => !o)}
        touchUiEnabled={touchUiEnabled}
        onToggleTouchUi={() => setTouchUiEnabled((v) => !v)}
        lastHit={lastHit}
      />

      <ChatOverlay
        open={chatOpen}
        playerName={player.name}
        messages={messages}
        onAddMessage={(msg) => setMessages((prev) => [...prev.slice(-39), msg])}
      />

      <MobileControls
        visible={touchUiEnabled}
        zone={zone}
        nearPortal={nearPortal}
      />

      {toast && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 -translate-x-1/2 z-40 max-w-[90vw] px-4 py-1.5 rounded-full stardew-panel font-display font-bold text-xs text-center">
          {toast}
        </div>
      )}
    </div>
  );
};
