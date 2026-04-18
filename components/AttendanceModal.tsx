"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  full_name: string;
  email: string;
  organisation_name?: string;
}

interface Attendee {
  id: string;
  user_id: string;
  attended: boolean;
  coins_awarded: boolean;
  created_at: string;
  profiles: Profile;
}

interface Event {
  id: string;
  title: string;
  created_by?: string;
  event_date?: string;
}

interface AttendanceModalProps {
  event: Event;
  adminUserId: string;
  onClose: () => void;
}

// ─── Attendance Modal ────────────────────────────────────────────────────────

export function AttendanceModal({
  event,
  adminUserId,
  onClose,
}: AttendanceModalProps) {
  const [members, setMembers] = useState<Profile[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [tab, setTab] = useState<"mark" | "history">("mark");

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch all members and existing attendees for this event
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, attendeesRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch(`/api/admin/attendance?event_id=${event.id}`),
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.users ?? []);
      }

      if (attendeesRes.ok) {
        const data = await attendeesRes.json();
        setAttendees(data.attendees ?? []);

        // Pre-select already-marked users
        const alreadyMarked = new Set<string>(
          (data.attendees ?? []).map((a: Attendee) => a.user_id)
        );
        setSelectedIds(alreadyMarked);
      }
    } catch {
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [event.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const alreadyAwardedIds = new Set(
    attendees.filter((a) => a.coins_awarded).map((a) => a.user_id)
  );

  const newSelections = [...selectedIds].filter((id) => !alreadyAwardedIds.has(id));

  const handleSubmit = async () => {
    if (newSelections.length === 0) {
      showToast("No new attendees selected", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          user_ids: newSelections,
          marked_by: adminUserId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error ?? "Failed to mark attendance", "error");
        return;
      }

      const awarded = data.results.filter(
        (r: { status: string }) => r.status === "marked_and_awarded" || r.status === "coins_awarded"
      ).length;

      showToast(`✓ Attendance marked — ${awarded} member(s) received coins`);
      await loadData();
    } catch {
      showToast("Network error", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Mark Attendance
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
              {event.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors ml-4"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Coin legend */}
        <div className="flex gap-3 px-6 pt-4">
          <span className="text-xs bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded-full font-medium">
            🪙 +20 Attendee
          </span>
          <span className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full font-medium">
            🪙 +60 Host
          </span>
          <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-full font-medium">
            {attendees.length} marked so far
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3">
          {(["mark", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                tab === t
                  ? "bg-blue-600 text-white"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {t === "mark" ? "Select Members" : "History"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tab === "mark" ? (
            <div className="space-y-2">
              {members.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No members found.</p>
              )}
              {members.map((member) => {
                const isSelected = selectedIds.has(member.id);
                const alreadyAwarded = alreadyAwardedIds.has(member.id);
                const isHost = event.created_by === member.id;

                return (
                  <label
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      alreadyAwarded
                        ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 opacity-70 cursor-not-allowed"
                        : isSelected
                        ? "border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={alreadyAwarded}
                      onChange={() => !alreadyAwarded && toggleMember(member.id)}
                      className="w-4 h-4 accent-blue-600"
                    />
                    {/* Avatar — initials only */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">
                        {member.full_name?.[0]?.toUpperCase() ?? "?"}
                      </span>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {member.full_name}
                        </span>
                        {isHost && (
                          <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                            Host
                          </span>
                        )}
                        {alreadyAwarded && (
                          <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                            ✓ Awarded
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {member.organisation_name ?? member.email}
                      </p>
                    </div>
                    {/* Coin badge */}
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                      {alreadyAwarded ? "" : isHost ? "+60 🪙" : "+20 🪙"}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            // History tab
            <div className="space-y-2">
              {attendees.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">
                  No attendance recorded yet.
                </p>
              )}
              {attendees.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">
                        {a.profiles?.full_name?.[0]?.toUpperCase() ?? "?"}
                    </span>
                </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {a.profiles?.full_name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(a.created_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      a.coins_awarded
                        ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                    }`}
                  >
                    {a.coins_awarded ? "✓ Coins awarded" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {tab === "mark" && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {newSelections.length} new selection{newSelections.length !== 1 ? "s" : ""}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || newSelections.length === 0}
                className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {submitting && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {submitting ? "Marking…" : "Mark Attendance"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-60 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
            toast.type === "error" ? "bg-red-600" : "bg-green-600"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Attendance Count Badge (for event cards) ────────────────────────────────

interface AttendanceBadgeProps {
  eventId: string;
}

export function AttendanceBadge({ eventId }: AttendanceBadgeProps) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/admin/attendance?event_id=${eventId}`)
      .then((r) => r.json())
      .then((d) => setCount(d.attendees?.length ?? 0))
      .catch(() => setCount(null));
  }, [eventId]);

  if (count === null) return null;

  return (
    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      {count} attended
    </span>
  );
}
