import React, { useEffect, useState } from 'react';
import {
  Check,
  LogIn,
  Mail,
  MessageSquare,
  RefreshCw,
  Swords,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type { AuthSession, FriendRecord, FriendsListResponse } from '../game/network/ApiClient';
import type { IncomingDungeonInvitePayload } from '../game/EventBus';
import { NativeDialog } from './NativeDialog';

interface FriendsModalProps {
  open: boolean;
  initialTab: 'friends' | 'inbox';
  authSession: AuthSession | null;
  friendsData: FriendsListResponse;
  dungeonInvites: IncomingDungeonInvitePayload[];
  onClose: () => void;
  onRefresh: () => void;
  onOpenAuth: () => void;
  onSendFriendRequestByName: (username: string) => void;
  onAcceptFriend: (friendshipId: string) => void;
  onDeclineFriend: (friendshipId: string) => void;
  onWhisper: (username: string) => void;
  onInviteDungeon: (friend: FriendRecord) => void;
  onAcceptDungeonInvite: (invite: IncomingDungeonInvitePayload) => void;
  onDeclineDungeonInvite: (inviteId: string) => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  open,
  initialTab,
  authSession,
  friendsData,
  dungeonInvites,
  onClose,
  onRefresh,
  onOpenAuth,
  onSendFriendRequestByName,
  onAcceptFriend,
  onDeclineFriend,
  onWhisper,
  onInviteDungeon,
  onAcceptDungeonInvite,
  onDeclineDungeonInvite,
}) => {
  const [tab, setTab] = useState<'friends' | 'inbox'>(initialTab);
  const [addUsername, setAddUsername] = useState('');

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      onRefresh();
    }
  }, [open, initialTab, onRefresh]);

  const inboxCount = friendsData.incoming.length + dungeonInvites.length;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = addUsername.trim();
    if (!clean) return;
    onSendFriendRequestByName(clean);
    setAddUsername('');
  };

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="Social Hub · Friends & Mail Inbox"
      subtitle={
        authSession
          ? `Signed in as ${authSession.username} (${authSession.storageMode === 'supabase' ? 'Supabase Cloud' : 'Local Save'})`
          : 'Playing as Guest — sign in to save your Friends List!'
      }
      maxWidthClass="w-[min(95vw,560px)]"
    >
      <div className="space-y-3 text-xs">
        {/* Tabs + Refresh */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab('friends')}
              className={`px-3.5 py-1.5 rounded-xl font-display font-bold text-xs border-2 flex items-center gap-1.5 transition ${
                tab === 'friends'
                  ? 'bg-amber-800 text-amber-50 border-amber-950'
                  : 'bg-amber-50 text-amber-950 border-amber-900/35 hover:bg-amber-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Friends ({friendsData.accepted.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('inbox')}
              className={`px-3.5 py-1.5 rounded-xl font-display font-bold text-xs border-2 flex items-center gap-1.5 transition ${
                tab === 'inbox'
                  ? 'bg-amber-800 text-amber-50 border-amber-950'
                  : 'bg-amber-50 text-amber-950 border-amber-900/35 hover:bg-amber-100'
              }`}
            >
              <Mail className="w-3.5 h-3.5" /> Inbox
              {inboxCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px]">
                  {inboxCount}
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="stardew-btn px-2.5 py-1 rounded-lg font-display font-bold text-[11px] inline-flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* ==================== FRIENDS TAB ==================== */}
        {tab === 'friends' && (
          <div className="space-y-3">
            {!authSession ? (
              <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-900/25 text-center space-y-2.5">
                <p className="font-display font-bold text-amber-950">
                  Sign in or create an account to save Friends & Cloud Progress!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="stardew-btn px-4 py-2 rounded-xl font-display font-bold text-xs inline-flex items-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" /> Login / Create Account
                </button>
              </div>
            ) : (
              <>
                <form onSubmit={handleAddSubmit} className="flex gap-1.5">
                  <input
                    type="text"
                    maxLength={20}
                    value={addUsername}
                    onChange={(e) => setAddUsername(e.target.value)}
                    placeholder="Add friend by exact username..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white border-2 border-amber-900/35 text-xs font-bold text-amber-950 focus:outline-none focus:border-amber-700"
                  />
                  <button
                    type="submit"
                    className="stardew-btn px-3 py-1.5 rounded-xl font-display font-bold text-xs inline-flex items-center gap-1 shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Add
                  </button>
                </form>

                <div className="space-y-2 max-h-[48dvh] overflow-y-auto pr-1">
                  {friendsData.accepted.length === 0 ? (
                    <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-900/20 text-center text-amber-800">
                      No friends yet! Tap another player in Phum Village Plaza or enter their username above.
                    </div>
                  ) : (
                    friendsData.accepted.map((f) => (
                      <div
                        key={f.friendshipId}
                        className="p-2.5 rounded-xl bg-amber-50/95 border-2 border-amber-900/25 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-display font-bold text-sm text-amber-950 flex items-center gap-1.5">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                f.online ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'
                              }`}
                            />
                            <span className="truncate">{f.username}</span>
                          </div>
                          <div className="text-[10px] font-bold text-amber-800">
                            {f.online ? `Online (${f.areaId ?? 'AREA 0'})` : 'Offline'} · Lv.{f.level} · Stylish {f.stylish}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onWhisper(f.username);
                              onClose();
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-display font-bold text-[11px] inline-flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" /> Whisper
                          </button>
                          {f.online && (
                            <button
                              type="button"
                              onClick={() => onInviteDungeon(f)}
                              className="px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-display font-bold text-[11px] inline-flex items-center gap-1"
                            >
                              <Swords className="w-3 h-3" /> Raid
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {friendsData.outgoing.length > 0 && (
                    <div className="pt-2 border-t border-amber-900/15 space-y-1">
                      <div className="text-[10px] font-bold uppercase text-amber-800/80">
                        Sent Pending Requests ({friendsData.outgoing.length})
                      </div>
                      {friendsData.outgoing.map((req) => (
                        <div
                          key={req.friendshipId}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-100/70 border border-amber-900/20 flex items-center justify-between text-[11px]"
                        >
                          <span className="font-bold text-amber-950">{req.username}</span>
                          <span className="text-amber-800 font-semibold">Pending...</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ==================== INBOX TAB ==================== */}
        {tab === 'inbox' && (
          <div className="space-y-2.5 max-h-[52dvh] overflow-y-auto pr-1">
            {inboxCount === 0 ? (
              <div className="p-5 rounded-xl bg-amber-50/80 border border-amber-900/20 text-center text-amber-800 space-y-1">
                <div className="font-display font-bold text-amber-950">Your Inbox is all caught up!</div>
                <div className="text-[11px]">
                  Incoming Friend Requests & Dungeon Party Invites will pop up here with a red ! badge.
                </div>
              </div>
            ) : (
              <>
                {dungeonInvites.map((inv) => (
                  <div
                    key={inv.inviteId}
                    className="p-3 rounded-xl bg-purple-50 border-2 border-purple-600/60 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-display font-bold text-xs text-purple-950 flex items-center gap-1.5">
                        <Swords className="w-4 h-4 text-purple-700 shrink-0" />
                        <span>Dungeon Party Invite from {inv.fromName}</span>
                      </div>
                      <div className="text-[10px] text-purple-800">
                        {inv.areaId} · Ready to challenge the Angkorian Dungeon Portal!
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onAcceptDungeonInvite(inv);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-display font-bold text-[11px] inline-flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeclineDungeonInvite(inv.inviteId)}
                        className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800"
                        aria-label="Decline dungeon invite"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {friendsData.incoming.map((req) => (
                  <div
                    key={req.friendshipId}
                    className="p-3 rounded-xl bg-emerald-50 border-2 border-emerald-700/50 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-display font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>Friend Request from {req.username}</span>
                      </div>
                      <div className="text-[10px] text-emerald-800">
                        Lv.{req.level} · Stylish {req.stylish} {req.online ? `· Online (${req.areaId})` : ''}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onAcceptFriend(req.friendshipId)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-display font-bold text-[11px] inline-flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeclineFriend(req.friendshipId)}
                        className="px-2 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-[11px]"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </NativeDialog>
  );
};
