import React, { useEffect, useState } from 'react';
import { apiGet } from '../../lib/api';
import { RefreshCw, AlertTriangle, Gamepad2, ChevronDown, ChevronRight } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  slug: string;
  status: string;
  providerCode: string | null;
  apiMapping: string | null;
  sortOrder: number;
}

interface GameType {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  providers: Provider[];
}

export default function GameProvidersPage() {
  const [gameTypes, setGameTypes] = useState<GameType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [allProviders, setAllProviders] = useState<Provider[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet<{ gameTypes: GameType[] }>('/game-types');
      setGameTypes(res.gameTypes || []);

      // Collect all unique providers
      const providerMap = new Map<string, Provider>();
      for (const gt of res.gameTypes || []) {
        for (const p of gt.providers) {
          providerMap.set(p.id, p);
        }
      }
      setAllProviders(Array.from(providerMap.values()));

      // Expand all by default
      setExpandedTypes(new Set((res.gameTypes || []).map(gt => gt.id)));
    } catch (err: any) {
      setError(err.message || 'Failed to load game providers');
    } finally {
      setLoading(false);
    }
  };

  const toggleType = (id: string) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalProviders = allProviders.length;
  const totalLinks = gameTypes.reduce((sum, gt) => sum + gt.providers.length, 0);

  return (
    <div>
      <div className="top">
        <div className="pt">
          <h1>Game Providers</h1>
          <p>{totalProviders} unique providers in {gameTypes.length} game types ({totalLinks} total links)</p>
        </div>
        <div className="ta">
          <button className="btn btn-s btn-sm" onClick={fetchData}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert a-err"><AlertTriangle size={16} /> {error}</div>}

      {loading ? (
        <div className="sg" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: '1rem' }}>
              <div className="sk" style={{ height: 14, width: '40%', marginBottom: 8 }} />
              <div className="sk" style={{ height: 20, width: '20%', marginBottom: 4 }} />
              <div className="sk" style={{ height: 14, width: '80%' }} />
            </div>
          ))}
        </div>
      ) : gameTypes.length === 0 ? (
        <div className="card">
          <div className="empty">
            <Gamepad2 size={40} style={{ color: 'var(--tx3)', marginBottom: '0.75rem' }} />
            <p>No game providers found. Run the seed script.</p>
          </div>
        </div>
      ) : (
        <div className="sg" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
          {gameTypes.map((gt) => {
            const isExpanded = expandedTypes.has(gt.id);
            const activeCount = gt.providers.filter(p => p.status === 'ACTIVE').length;

            return (
              <div key={gt.id} className="card" style={{ padding: '1rem' }}>
                <div
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}
                  onClick={() => toggleType(gt.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>{gt.name}</h3>
                  </div>
                  <span className="sc-ch">{gt.providers.length} providers ({activeCount} active)</span>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: '0.5rem' }}>
                    {gt.providers.map(p => (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.35rem 0.5rem',
                          borderBottom: '1px solid var(--br2)',
                          fontSize: '0.875rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{p.name}</span>
                          {p.providerCode && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--tx3)' }}>
                              [{p.providerCode}]
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {p.apiMapping && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--tx3)' }}>
                              {p.apiMapping}
                            </span>
                          )}
                          <span className={`sc-ch ${p.status === 'ACTIVE' ? 'up' : 'down'}`}>
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}