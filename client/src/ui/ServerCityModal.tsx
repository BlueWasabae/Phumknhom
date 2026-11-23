import React from 'react';
import { CITY_SERVERS, type CityServerId } from '@shared/worldMapData';
import { CheckCircle2, Globe2, Signal } from 'lucide-react';
import { NativeDialog } from './NativeDialog';

interface ServerCityModalProps {
  open: boolean;
  currentCity: CityServerId;
  online: boolean;
  playerCount: number;
  onClose: () => void;
  onSelectCity: (city: CityServerId) => void;
}

export const ServerCityModal: React.FC<ServerCityModalProps> = ({
  open,
  currentCity,
  online,
  playerCount,
  onClose,
  onSelectCity,
}) => {
  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title="🌏 Select Cambodian City Server"
      subtitle="Switch regional Plaza hubs anytime — your Cloud Save, Farm & Inventory travel with you!"
      maxWidthClass="w-[min(94vw,560px)]"
    >
      <div className="space-y-2.5 text-xs">
        {CITY_SERVERS.map((city) => {
          const active = city.id === currentCity;
          return (
            <button
              key={city.id}
              type="button"
              onClick={() => {
                onSelectCity(city.id);
                onClose();
              }}
              className={`w-full text-left p-3.5 rounded-2xl border-2 transition flex items-center justify-between gap-3 ${
                active
                  ? 'bg-amber-100 border-amber-900 ring-2 ring-amber-400 shadow'
                  : 'bg-amber-50/90 border-amber-900/30 hover:bg-white'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Globe2 className="w-4 h-4 shrink-0" style={{ color: city.accentColor }} />
                  <span className="font-display font-bold text-sm text-amber-950">
                    {city.name} · {city.khmerName}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 font-mono text-[9px] font-bold">
                    {city.regionCode}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-amber-900">{city.tagline}</div>
                <div className="text-[10px] text-emerald-900 font-bold">{city.perk}</div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-mono font-bold text-[10px]">
                  <Signal className="w-3 h-3" /> {city.basePingMs}ms
                </span>
                {active ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-700 text-white font-display font-bold text-[10px]">
                    <CheckCircle2 className="w-3 h-3" /> Active ({online ? `${playerCount} online` : 'Local'})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-800 text-amber-50 font-display font-bold text-[10px]">
                    Connect
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </NativeDialog>
  );
};
