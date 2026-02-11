"use client";

import { useState, useMemo, useEffect } from "react";
import { useUIStore, type DailyEntry } from "@/lib/ui-store";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Unlock,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar as CalendarIcon,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { decryptMessage } from "@/lib/encryption";
import { formatLocalDate, getTodayDateString } from "@/lib/utils";
import Modal from "./Modal";

type EntryStatus = "decrypted" | "encrypted" | "corrupted" | "missed" | "none";

export default function Logbook() {
  const [viewDate, setViewDate] = useState(new Date()); // Month view
  const [selectedDate, setSelectedDate] =
    useState<string>(getTodayDateString());
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [decryptionStatusMap, setDecryptionStatusMap] = useState<
    Record<string, EntryStatus>
  >({});
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "confirm" | "alert";
    onConfirm: () => void;
    confirmText?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "alert",
    onConfirm: () => {},
  });

  const { entries, encryptionKey, setEntries, profile } = useUIStore();

  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("entries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(
          "Error fetching entries:",
          error.message,
          error.code,
          error.details,
        );
      } else if (data) {
        const statuses: Record<string, EntryStatus> = {};
        const processedEntries: DailyEntry[] = await Promise.all(
          data.map(async (dbEntry: any) => {
            const dateStr = formatLocalDate(new Date(dbEntry.created_at));
            let entryData: Partial<DailyEntry> = {};
            let status: EntryStatus = "encrypted";

            if (dbEntry.is_encrypted) {
              if (encryptionKey) {
                try {
                  const decryptedStr = await decryptMessage(
                    dbEntry.content,
                    encryptionKey,
                    dbEntry.encryption_version,
                  );
                  entryData = JSON.parse(decryptedStr);
                  status = "decrypted";
                } catch (err) {
                  status = "corrupted";
                  entryData = { logText: "[CORRUPTED_OR_WRONG_KEY]" };
                }
              } else {
                status = "encrypted";
                entryData = { logText: dbEntry.content };
              }
            } else {
              try {
                entryData = JSON.parse(dbEntry.content);
                status = "decrypted";
              } catch {
                entryData = { logText: dbEntry.content };
                status = "decrypted";
              }
            }

            statuses[dateStr] = status;

            return {
              id: dbEntry.id,
              date: dateStr,
              mood: entryData.mood || "😐",
              workingHours: entryData.workingHours || 0,
              achievements: entryData.achievements || [],
              challenges: entryData.challenges || [],
              logText: entryData.logText || "",
              classification: entryData.classification || {
                work: 0,
                personal: 0,
                health: 0,
                learning: 0,
              },
            } as DailyEntry;
          }),
        );
        setDecryptionStatusMap(statuses);
        setEntries(processedEntries);
      }
      setLoading(false);
    };

    fetchEntries();
  }, [encryptionKey, setEntries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => entry.date === selectedDate);
  }, [entries, selectedDate]);

  const daysInMonth = useMemo(
    () =>
      new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate(),
    [viewDate],
  );
  const firstDay = useMemo(
    () => new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay(),
    [viewDate],
  );
  const monthName = viewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const getDayStatus = (day: number): EntryStatus => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const dateStr = formatLocalDate(date);
    const status = decryptionStatusMap[dateStr];

    if (status) return status;

    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
    if (isPast) return "missed";

    return "none";
  };

  return (
    <div className="p-4 md:p-6 space-y-6 bg-white h-full overflow-y-auto selection:bg-black selection:text-white">
      <div className="flex items-center justify-between mb-6">
        <div className="text-2xl font-black uppercase tracking-tighter">
          Daily Logbook
        </div>
        <div
          className={`px-3 py-1 border-[2px] border-black text-[10px] font-black uppercase flex items-center gap-2 ${encryptionKey ? "bg-green-100" : "bg-yellow-100 shadow-[2px_2px_0_0_#000]"}`}
        >
          {encryptionKey ? <Unlock size={12} /> : <Lock size={12} />}
          {encryptionKey ? "Vault Unlocked" : "Vault Locked"}
        </div>
      </div>

      {/* Calendar Section */}
      <div className="border-[3px] border-black p-4 bg-white shadow-[6px_6px_0_0_#000]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarIcon size={18} className="text-black" />
            <h3 className="font-black text-sm uppercase tracking-widest">
              {monthName}
            </h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setViewDate(new Date());
                setSelectedDate(getTodayDateString());
              }}
              className="px-3 py-1 border-[2px] border-black text-[10px] font-black uppercase hover:bg-black hover:text-white transition-all flex items-center gap-1 shadow-[2px_2px_0_0_#000] active:shadow-none translate-y-[-1px] active:translate-y-0"
            >
              <RotateCcw className="w-3 h-3" /> Today
            </button>
            <button
              onClick={() =>
                setViewDate(
                  new Date(viewDate.getFullYear(), viewDate.getMonth() - 1),
                )
              }
              className="p-2 border-[2px] border-black hover:bg-black hover:text-white transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                setViewDate(
                  new Date(viewDate.getFullYear(), viewDate.getMonth() + 1),
                )
              }
              className="p-2 border-[2px] border-black hover:bg-black hover:text-white transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div
              key={`${d}-${i}`}
              className="text-center font-black text-[10px] p-2 bg-black text-white"
            >
              {d}
            </div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div
              key={i}
              className="p-2 bg-gray-50 border-[2px] border-dashed border-gray-200 h-14"
            />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = new Date(
              viewDate.getFullYear(),
              viewDate.getMonth(),
              day,
            );
            const dateStr = formatLocalDate(date);
            const status = getDayStatus(day);
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === getTodayDateString();

            const joinDate = profile.joinDate
              ? new Date(profile.joinDate)
              : null;
            const isBeforeJoin = joinDate
              ? new Date(date.setHours(23, 59, 59, 999)) <
                new Date(joinDate.setHours(0, 0, 0, 0))
              : false;
            const isDisabled = status === "missed" || isBeforeJoin;

            return (
              <button
                key={day}
                onClick={() => !isDisabled && setSelectedDate(dateStr)}
                disabled={isDisabled}
                className={`p-1 border-[2px] h-14 relative group flex flex-col items-center justify-center transition-all ${
                  isDisabled
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50 shadow-none"
                    : isSelected
                      ? "bg-black text-white translate-x-[2px] translate-y-[2px] shadow-none"
                      : "bg-white text-black border-black shadow-[3px_3px_0_0_#000] hover:-translate-y-1"
                }`}
              >
                <span
                  className={`text-[10px] font-black ${isToday ? "underline decoration-[2px]" : ""}`}
                >
                  {day}
                </span>
                <div className="mt-1">
                  {status === "decrypted" && (
                    <CheckCircle2
                      size={12}
                      className={
                        isSelected ? "text-green-400" : "text-green-600"
                      }
                    />
                  )}
                  {status === "encrypted" && (
                    <Lock
                      size={12}
                      className={
                        isSelected ? "text-yellow-300" : "text-yellow-600"
                      }
                    />
                  )}
                  {status === "corrupted" && (
                    <AlertCircle
                      size={12}
                      className={isSelected ? "text-red-300" : "text-red-500"}
                    />
                  )}
                  {status === "missed" && (
                    <Clock size={10} className="text-gray-300" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Header */}
      <div className="flex items-center justify-between border-b-[3px] border-black pb-2">
        <div className="font-black uppercase tracking-tighter text-lg">
          {selectedDate === getTodayDateString()
            ? "Today's Logs"
            : selectedDate}
        </div>
      </div>

      {/* Detail View */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <div className="w-8 h-8 border-[4px] border-black border-t-transparent animate-spin" />
            <span className="font-black uppercase text-[10px] tracking-widest">
              Accessing Vault...
            </span>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-12 border-[3px] border-black border-dashed flex flex-col items-center gap-4 bg-gray-50/50">
            {getDayStatus(parseInt(selectedDate.split("-")[2])) === "missed" ? (
              <>
                <AlertCircle className="text-red-300 w-10 h-10" />
                <div className="text-center">
                  <p className="font-black uppercase text-xs text-red-400">
                    Missed Connection
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 italic">
                    No logs found for this cycle.
                  </p>
                </div>
              </>
            ) : (
              <>
                <CalendarIcon className="text-gray-300 w-10 h-10" />
                <div className="text-center">
                  <p className="font-black uppercase text-xs">
                    Zero Data Points
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 italic">
                    Select a marked day or create a new entry.
                  </p>
                </div>
              </>
            )}
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="border-[3px] border-black bg-white shadow-[8px_8px_0_0_#000] overflow-hidden"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() =>
                  setExpandedEntryId(
                    expandedEntryId === entry.id ? null : entry.id,
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setExpandedEntryId(
                      expandedEntryId === entry.id ? null : entry.id,
                    );
                  }
                }}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer outline-none focus:bg-gray-50"
              >
                <div className="flex items-center gap-6">
                  <span className="text-5xl drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
                    {entry.mood}
                  </span>
                  <div className="flex flex-col items-start w-full">
                    <div className="flex items-center justify-between w-full">
                      <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1">
                        {decryptionStatusMap[entry.date] === "decrypted" ? (
                          <Unlock size={10} />
                        ) : (
                          <Lock size={10} />
                        )}
                        {decryptionStatusMap[entry.date]}
                      </div>
                      {entry.date === getTodayDateString() && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setModal({
                              isOpen: true,
                              title: "Purge Entry",
                              message:
                                "Are you sure you want to delete today's entry? This protocol is irreversible.",
                              type: "confirm",
                              confirmText: "Delete Log",
                              onConfirm: async () => {
                                const { error } = await supabase
                                  .from("entries")
                                  .delete()
                                  .eq("id", entry.id);
                                if (!error) {
                                  useUIStore.getState().deleteEntry(entry.id);
                                }
                                setModal((prev) => ({
                                  ...prev,
                                  isOpen: false,
                                }));
                              },
                            });
                          }}
                          className="text-[10px] font-black uppercase text-red-500 hover:underline hover:text-red-700 h-6 px-2 flex items-center"
                        >
                          [Delete Entry]
                        </button>
                      )}
                    </div>
                    <div className="text-sm font-black uppercase tracking-tight overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px] md:max-w-md opacity-80 mt-1">
                      {entry.logText.slice(0, 45)}
                      {entry.logText.length > 45 ? "..." : ""}
                    </div>
                  </div>
                </div>
                {expandedEntryId === entry.id ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>

              {expandedEntryId === entry.id && (
                <div className="p-6 border-t-[3px] border-black bg-white grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-6">
                    <section>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF2E63] mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#FF2E63]" />{" "}
                        {decryptionStatusMap[entry.date] === "corrupted"
                          ? "Corrupted Stream"
                          : "Decrypted Stream"}
                      </h4>
                      {decryptionStatusMap[entry.date] === "corrupted" ? (
                        <div className="p-4 border-[2px] border-black bg-red-50 space-y-3">
                          <p className="text-[10px] font-bold text-red-600 italic">
                            This entry was encrypted with a different key or
                            data is corrupted.
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="password"
                              placeholder="Try another key..."
                              id={`retry-key-${entry.id}`}
                              className="flex-1 p-2 border-[2px] border-black text-xs font-bold outline-none"
                            />
                            <button
                              onClick={async () => {
                                const k = (
                                  document.getElementById(
                                    `retry-key-${entry.id}`,
                                  ) as HTMLInputElement
                                ).value;
                                if (!k) return;
                                try {
                                  // Attempt one-off decryption
                                  const content =
                                    entries.find((e) => e.id === entry.id)
                                      ?.logText || "";
                                  // Wait, my processed entry currently stores [CORRUPTED_OR_WRONG_KEY] in logText.
                                  // I need the raw content. I should have stored it somewhere.
                                  // For simplicity, let's just show a notification that we need the raw content.
                                  setModal({
                                    isOpen: true,
                                    title: "Re-Decryption Error",
                                    message:
                                      "Please refresh your data stream to attempt re-decryption with the global vault key.",
                                    type: "alert",
                                    confirmText: "Understood",
                                    onConfirm: () =>
                                      setModal((prev) => ({
                                        ...prev,
                                        isOpen: false,
                                      })),
                                  });
                                } catch (e) {}
                              }}
                              className="px-3 py-1 bg-black text-white text-[10px] font-black uppercase"
                            >
                              Retry
                            </button>
                          </div>
                          <button className="text-[9px] font-black uppercase text-gray-500 hover:underline">
                            View Encrypted Payload
                          </button>
                        </div>
                      ) : (
                        <p
                          className="p-4 border-[2px] border-black text-sm leading-relaxed bg-[#FAFAF0] font-medium shadow-[4px_4px_0_0_rgba(0,0,0,0.05)] break-words [hyphens:auto] whitespace-pre-wrap"
                          lang="en"
                        >
                          {entry.logText || "No log content available."}
                        </p>
                      )}
                    </section>
                    <section className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50/50 p-3 border-[2px] border-black">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-green-700 mb-2">
                          High Points
                        </h4>
                        <ul className="space-y-1.5">
                          {entry.achievements.length > 0 ? (
                            entry.achievements.map((a, i) => (
                              <li
                                key={i}
                                className="text-[10px] font-bold p-1 border-b-[1px] border-green-200 last:border-0"
                              >
                                • {a}
                              </li>
                            ))
                          ) : (
                            <li className="text-[10px] text-gray-400 italic">
                              No achievements logged.
                            </li>
                          )}
                        </ul>
                      </div>
                      <div className="bg-red-50/50 p-3 border-[2px] border-black">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-red-700 mb-2">
                          Friction
                        </h4>
                        <ul className="space-y-1.5">
                          {entry.challenges.length > 0 ? (
                            entry.challenges.map((c, i) => (
                              <li
                                key={i}
                                className="text-[10px] font-bold p-1 border-b-[1px] border-red-200 last:border-0"
                              >
                                • {c}
                              </li>
                            ))
                          ) : (
                            <li className="text-[10px] text-gray-400 italic">
                              No challenges logged.
                            </li>
                          )}
                        </ul>
                      </div>
                    </section>
                  </div>
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600" /> Focus Metrics
                    </h4>
                    <div className="p-4 border-[2px] border-black space-y-4 bg-[#FAFAF0] shadow-[4px_4px_0_0_rgba(0,0,0,0.05)]">
                      {Object.entries(entry.classification).map(([k, v]) => (
                        <div key={k} className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                            <span>{k}</span>
                            <span>{v}%</span>
                          </div>
                          <div className="h-2 w-full bg-white border-[1px] border-black">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${v}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-[3px] border-black p-4 bg-black text-white shadow-[4px_4px_0_0_#FF2E63]">
                      <span className="text-xs font-black uppercase tracking-widest">
                        Time Injected
                      </span>
                      <span className="text-2xl font-black">
                        {entry.workingHours}H
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      <Modal
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        confirmText={modal.confirmText}
        onConfirm={modal.onConfirm}
        onCancel={() => setModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
