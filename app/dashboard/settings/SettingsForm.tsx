"use client";

import { useState } from "react";
import { updateUserSettings, SettingsFormState } from "./actions";
import {
  Building2,
  Mail,
  Bell,
  Clock,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquare,
} from "lucide-react";

interface SettingsFormProps {
  initialData: SettingsFormState;
}

export default function SettingsForm({ initialData }: SettingsFormProps) {
  const [formData, setFormData] = useState<SettingsFormState>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      await updateUserSettings(formData);
      setFeedback({
        type: "success",
        message: "Your brand details and dunning sequence settings have been updated.",
      });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update settings.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {feedback && (
        <div
          className={`flex items-center gap-2.5 p-4 rounded-xl text-xs font-semibold border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Brand & Identity Settings */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
          <Building2 className="w-5 h-5 text-indigo-600" />
          <div>
            <h2 className="text-base font-bold text-gray-900">Brand Identity</h2>
            <p className="text-xs text-gray-500">
              Customize how your business appears to customers in recovery communications.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Company Name
            </label>
            <input
              type="text"
              required
              value={formData.companyName}
              onChange={(e) =>
                setFormData({ ...formData, companyName: e.target.value })
              }
              placeholder="Acme Corp"
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Support Email
            </label>
            <input
              type="email"
              required
              value={formData.supportEmail}
              onChange={(e) =>
                setFormData({ ...formData, supportEmail: e.target.value })
              }
              placeholder="billing@acme.com"
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Channel Toggles */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
          <Bell className="w-5 h-5 text-indigo-600" />
          <div>
            <h2 className="text-base font-bold text-gray-900">Outreach Channels</h2>
            <p className="text-xs text-gray-500">
              Enable or disable messaging channels used during automated recovery loops.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Email Recovery Sequence</p>
                <p className="text-xs text-gray-500">
                  Send transactional payment retry emails via Resend.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={formData.enableEmail}
              onChange={(e) =>
                setFormData({ ...formData, enableEmail: e.target.checked })
              }
              className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">WhatsApp Instant Reminders</p>
                <p className="text-xs text-gray-500">
                  Send automated direct WhatsApp templates via Twilio when phone numbers are present.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={formData.enableWhatsApp}
              onChange={(e) =>
                setFormData({ ...formData, enableWhatsApp: e.target.checked })
              }
              className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Dunning Schedule Configuration */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
          <Clock className="w-5 h-5 text-indigo-600" />
          <div>
            <h2 className="text-base font-bold text-gray-900">Sequence Cadence (Hours)</h2>
            <p className="text-xs text-gray-500">
              Specify execution delays after an initial charge failure event.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Step 1: Immediate (Day 0)
            </span>
            <input
              type="number"
              min="0"
              max="24"
              value={formData.day0DelayHours}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  day0DelayHours: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <p className="text-xs text-gray-400">Hours after payment failure</p>
          </div>

          <div className="space-y-1.5 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Step 2: Follow-up (Day 3)
            </span>
            <input
              type="number"
              min="1"
              max="168"
              value={formData.day3DelayHours}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  day3DelayHours: parseInt(e.target.value) || 72,
                })
              }
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <p className="text-xs text-gray-400">Hours after Step 1</p>
          </div>

          <div className="space-y-1.5 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Step 3: Final Call (Day 7)
            </span>
            <input
              type="number"
              min="1"
              max="336"
              value={formData.day7DelayHours}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  day7DelayHours: parseInt(e.target.value) || 168,
                })
              }
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <p className="text-xs text-gray-400">Hours after Step 2</p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-3 px-6 rounded-xl text-sm transition-all shadow-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}