import { useDialog } from '../hooks/useDialog';
import React, { useState } from 'react';
import { VotingCard, Trip } from '../types';
import {
  ThumbsUp,
  ThumbsDown,
  Plus,
  Users,
  Award,
  DollarSign,
  Sparkles,
} from 'lucide-react';

interface VotingRoomViewProps {
  trip: Trip;
  cards: VotingCard[];
  onVote: (cardId: string, direction: 'up' | 'down') => void;
  onAddCard: (card: VotingCard) => void;
}

export const VotingRoomView: React.FC<VotingRoomViewProps> = ({
  trip,
  cards,
  onVote,
  onAddCard,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const dialogRef = useDialog(showAddModal, () => setShowAddModal(false));
  const [title, setTitle] = useState('');
  const [type, setType] = useState<VotingCard['type']>('Activity');
  const [photo, setPhoto] = useState('');
  const [description, setDescription] = useState('');
  const [costEst, setCostEst] = useState('');

  const sortedCards = [...cards].sort(
    (a, b) => b.votesUp - b.votesDown - (a.votesUp - a.votesDown)
  );
  const leadingCard = sortedCards[0];

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newCard: VotingCard = {
      id: `vote-${Date.now()}`,
      tripId: trip.id,
      title: title.trim(),
      type,
      photo: photo.trim() || '/images/tokyo.jpg',
      description:
        description.trim() ||
        'Exciting travel candidate suggested by group member.',
      costEst: Math.max(0, parseFloat(costEst) || 0),
      votesUp: 1,
      votesDown: 0,
      userVoted: 'up',
    };

    onAddCard(newCard);
    setTitle('');
    setDescription('');
    setCostEst('');
    setPhoto('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <Users className="w-4 h-4" />
            <span>GOOD IDEAS START HERE</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            What should we do together?
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Collect ideas and vote on your favorites. Saved on this browser
            only, not synced with other travelers.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-900/30 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add an idea</span>
        </button>
      </div>

      {cards.length === 0 && (
        <div className="empty-state">
          <h3>Every good trip starts with an idea.</h3>
          <p>Add a place to eat, stay, or explore.</p>
        </div>
      )}
      {/* Leading Candidate Spotlight */}
      {leadingCard && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 shadow-xl flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              🏆 Group Favorite Activity ({leadingCard.votesUp} Upvotes)
            </span>
            <h4 className="text-base font-bold text-white mt-0.5">
              {leadingCard.title}
            </h4>
            <p className="text-xs text-slate-300">{leadingCard.description}</p>
          </div>
        </div>
      )}

      {/* Cards Deck */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedCards.map((card) => (
          <div
            key={card.id}
            className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg hover:border-cyan-500/40 transition flex flex-col"
          >
            <div className="relative h-44 w-full">
              <img
                src={card.photo}
                alt={card.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md text-[11px] font-bold text-cyan-300 border border-cyan-500/30">
                {card.type}
              </div>
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md text-[11px] font-bold text-emerald-400 border border-emerald-500/30">
                ${card.costEst} est.
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="text-base font-bold text-white leading-snug">
                  {card.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {card.description}
                </p>
              </div>

              {/* Voting Action Bar */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Score:{' '}
                  <strong className="text-white font-mono">
                    {card.votesUp - card.votesDown}
                  </strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    aria-label={`Upvote ${card.title}`}
                    aria-pressed={card.userVoted === 'up'}
                    onClick={() => onVote(card.id, 'up')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      card.userVoted === 'up'
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{card.votesUp}</span>
                  </button>

                  <button
                    aria-label={`Downvote ${card.title}`}
                    aria-pressed={card.userVoted === 'down'}
                    onClick={() => onVote(card.id, 'down')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      card.userVoted === 'down'
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    <span>{card.votesDown}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Propose Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Add idea"
            className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-bold text-white">Share an idea</h3>
            <form onSubmit={handleCreateCard} className="space-y-3">
              <div>
                <label
                  htmlFor="votingroomview-field-1"
                  className="text-xs font-bold text-slate-300 block mb-1"
                >
                  Title *
                </label>
                <input
                  id="votingroomview-field-1"
                  type="text"
                  required
                  placeholder="e.g. Scuba Diving with Whale Sharks"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="votingroomview-field-2"
                    className="text-xs font-bold text-slate-300 block mb-1"
                  >
                    Type
                  </label>
                  <select
                    id="votingroomview-field-2"
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Activity">Activity</option>
                    <option value="Dining">Dining</option>
                    <option value="Lodging">Lodging</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="votingroomview-field-3"
                    className="text-xs font-bold text-slate-300 block mb-1"
                  >
                    Estimated Cost ($)
                  </label>
                  <input
                    id="votingroomview-field-3"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="75"
                    value={costEst}
                    onChange={(e) => setCostEst(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="votingroomview-field-4"
                  className="text-xs font-bold text-slate-300 block mb-1"
                >
                  Photo URL (optional)
                </label>
                <input
                  id="votingroomview-field-4"
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={photo}
                  onChange={(e) => setPhoto(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label
                  htmlFor="votingroomview-field-5"
                  className="text-xs font-bold text-slate-300 block mb-1"
                >
                  Why you’ll love it
                </label>
                <textarea
                  id="votingroomview-field-5"
                  rows={2}
                  placeholder="Why should the group choose this?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition"
                >
                  Save idea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
