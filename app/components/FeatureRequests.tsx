"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUIStore } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  PlayCircle,
  XCircle,
  Trash2,
  Filter as FilterIcon,
  AlertTriangle,
} from "lucide-react";
import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";
import Modal from "./Modal";

type Request = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "planned" | "in-progress" | "completed" | "rejected";
  created_at: string;
};

export default function FeatureRequests() {
  const { profile } = useUIStore();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [statusFilter, setStatusFilter] = useState<Request["status"] | "all">(
    "all",
  );
  const [lastRequestDate, setLastRequestDate] = useState<string | null>(null);
  const [profanityWarning, setProfanityWarning] = useState(false);
  const [matcher] = useState(
    () =>
      new RegExpMatcher({
        ...englishDataset.build(),
        ...englishRecommendedTransformers,
      }),
  );
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "confirm" | "alert";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "alert",
    onConfirm: () => {},
  });

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("feature_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRequests(data);
    }

    // Check for last request from current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: lastReq } = await supabase
        .from("feature_requests")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastReq) {
        setLastRequestDate(new Date(lastReq.created_at).toDateString());
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const today = new Date().toDateString();
    if (lastRequestDate === today && !profile.isAdmin) {
      setModal({
        isOpen: true,
        title: "Rate Limit Reached",
        message:
          "You can only submit one feature request per day. Quality over quantity!",
        type: "alert",
        onConfirm: () => setModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    setSubmitting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Clean profanity before submitting
    const cleanTitle = matcher.hasMatch(newTitle)
      ? newTitle.replace(/\b\w+\b/g, (word) =>
          matcher.hasMatch(word) ? "****" : word,
        )
      : newTitle;
    const cleanDesc = matcher.hasMatch(newDesc)
      ? newDesc.replace(/\b\w+\b/g, (word) =>
          matcher.hasMatch(word) ? "****" : word,
        )
      : newDesc;

    const { error } = await supabase.from("feature_requests").insert({
      title: cleanTitle,
      description: cleanDesc,
      user_id: user.id,
    });

    if (!error) {
      setNewTitle("");
      setNewDesc("");
      setProfanityWarning(false);
      fetchRequests();
    }
    setSubmitting(false);
  };

  const handleTitleChange = (value: string) => {
    setNewTitle(value);
    setProfanityWarning(matcher.hasMatch(value));
  };

  const handleDescChange = (value: string) => {
    setNewDesc(value);
    setProfanityWarning(matcher.hasMatch(value) || matcher.hasMatch(newTitle));
  };

  const deleteRequest = async (id: string) => {
    setModal({
      isOpen: true,
      title: "Delete Request",
      message:
        "Are you sure you want to permanently delete this feature request from the database?",
      type: "confirm",
      onConfirm: async () => {
        const { data, error } = await supabase
          .from("feature_requests")
          .delete()
          .eq("id", id)
          .select();

        if (!error && data && data.length > 0) {
          fetchRequests();
          // Optional: Add a success toast here
        } else if (!error && (!data || data.length === 0)) {
          // Request succeeded but no rows found (likely permission issue or already deleted)
          alert("Could not delete request. Check permissions.");
        }
        setModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const updateStatus = async (id: string, status: Request["status"]) => {
    const { error } = await supabase
      .from("feature_requests")
      .update({ status })
      .eq("id", id);

    if (!error) {
      fetchRequests();
    }
  };

  const getStatusIcon = (status: Request["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="text-green-500 w-4 h-4" />;
      case "in-progress":
        return <PlayCircle className="text-blue-500 w-4 h-4" />;
      case "planned":
        return <Clock className="text-yellow-500 w-4 h-4" />;
      case "rejected":
        return <XCircle className="text-red-500 w-4 h-4" />;
      default:
        return <Clock className="text-gray-400 w-4 h-4" />;
    }
  };

  const filteredRequests =
    statusFilter === "all"
      ? requests.filter(
          (r) => profile.isAdmin || !["pending", "rejected"].includes(r.status),
        )
      : requests.filter((r) => r.status === statusFilter);

  const availableFilters = profile.isAdmin
    ? ([
        "all",
        "pending",
        "planned",
        "in-progress",
        "completed",
        "rejected",
      ] as const)
    : (["all", "planned", "in-progress", "completed"] as const);

  const isLocked =
    lastRequestDate === new Date().toDateString() && !profile.isAdmin;

  return (
    <div className="p-4 md:p-6 space-y-8 bg-white max-h-[600px] overflow-y-auto selection:bg-black selection:text-white">
      {!profile.isAdmin && (
        <div className="space-y-4">
          <h2 className="text-xl font-black uppercase flex items-center gap-2">
            <MessageSquare className="w-6 h-6" /> Suggest a Feature
          </h2>
          <form
            onSubmit={handleSubmit}
            className="space-y-4 p-4 border-[3px] border-black bg-yellow-50 shadow-[4px_4px_0_0_#000]"
          >
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-black/50">
                Feature Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="What should we add?"
                className="w-full p-3 border-2 border-black font-bold outline-none focus:bg-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-black/50">
                Description (Optional)
              </label>
              <textarea
                value={newDesc}
                onChange={(e) => handleDescChange(e.target.value)}
                placeholder="Tell us more about it..."
                className="w-full p-3 border-2 border-black font-bold outline-none focus:bg-white h-24"
              />
            </div>
            {profanityWarning && (
              <div className="p-3 border-2 border-red-500 bg-red-50 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-xs font-black uppercase text-red-600">
                  Inappropriate language detected. Words will be censored on
                  submit.
                </p>
              </div>
            )}
            <button
              type="submit"
              disabled={submitting || !newTitle || isLocked}
              className="w-full p-4 bg-black text-white font-black uppercase tracking-widest hover:bg-[#FF2E63] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLocked ? (
                <Clock className="w-5 h-5" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
              {isLocked ? "Daily Limit Reached" : "Submit Request"}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-black uppercase">
            {profile.isAdmin ? "Management Dashboard" : "Roadmap & Requests"}
          </h2>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            <FilterIcon className="w-4 h-4 flex-shrink-0" />
            {availableFilters.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 border-2 border-black text-[10px] font-black uppercase whitespace-nowrap transition-all ${statusFilter === s ? "bg-black text-white" : "bg-white hover:bg-gray-100"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-black/20" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <p className="text-sm font-bold text-black/40 italic">
            No {statusFilter !== "all" ? statusFilter : ""} requests found.
          </p>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className={cn(
                  "p-4 border-[3px] border-black shadow-[4px_4px_0_0_#000] space-y-3 transition-colors",
                  profile.isAdmin
                    ? "bg-indigo-50 border-indigo-900 shadow-indigo-900/20"
                    : "bg-white",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-black text-lg uppercase leading-tight">
                      {req.title}
                    </h3>
                    {req.description && (
                      <p className="text-sm font-bold text-gray-600">
                        {req.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 px-2 py-1 border-2 border-black bg-white text-[10px] font-black uppercase">
                      {getStatusIcon(req.status)}
                      {req.status.replace("-", " ")}
                    </div>
                    {profile.isAdmin && (
                      <button
                        onClick={() => deleteRequest(req.id)}
                        className="p-1 hover:text-[#FF2E63] transition-colors"
                        title="Delete from DB"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {profile.isAdmin && (
                  <div className="pt-3 border-t-2 border-black/10 flex flex-wrap gap-2">
                    {(
                      [
                        "pending",
                        "planned",
                        "in-progress",
                        "completed",
                        "rejected",
                      ] as const
                    ).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(req.id, s)}
                        className={`px-2 py-1 border-2 border-black text-[9px] font-black uppercase transition-all ${req.status === s ? "bg-black text-white" : "hover:bg-black/5"}`}
                      >
                        {s.replace("-", " ")}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <Modal
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={() => modal.onConfirm()}
        onCancel={() => setModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
