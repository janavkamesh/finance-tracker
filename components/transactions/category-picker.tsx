"use client";

import { useState, useMemo, useEffect, useRef, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  Search, X, Check, ChevronDown, Plus, ArrowLeft,
  Tag, Trash2, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createCategory, safeDeleteCategory } from "@/actions/categories";
import { ICON_REGISTRY, getCategoryIcon } from "@/lib/category-icons";

interface Category {
  id: string;
  name: string;
  type: "income" | "expense" | "both";
  color?: string | null;
  icon?: string | null;
  /** null / undefined = system category; truthy = user-created */
  user_id?: string | null;
  created_at?: string | null;
}

interface Props {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  onClose?: () => void;
  error?: string;
  /**
   * The currently active transaction tab. Used to:
   *   1. Filter the category list to matching types
   *   2. Tag newly created categories with the correct type (never "both")
   */
  transactionType?: "income" | "expense";
}

const ICON_LIST: Array<{ key: string; Icon: LucideIcon }> = Object.entries(
  ICON_REGISTRY
).map(([key, Icon]) => ({ key, Icon }));

const PRESET_COLORS = [
  "#1E6B4E", "#2563EB", "#DC2626", "#D97706",
  "#7C3AED", "#EC4899", "#0D9488", "#92400E",
];



// ── Main component ──────────────────────────────────────────────────────────
export function CategoryPicker({
  categories,
  value,
  onChange,
  onClose,
  error,
  transactionType,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"list" | "create">("list");
  const [search, setSearch] = useState("");
  const [localCategories, setLocalCategories] = useState<Category[]>([]);

  // Deletion state
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Create-category form state
  const [selectedIconKey, setSelectedIconKey] = useState("Tag");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState("");
  const [isPending, startTransition] = useTransition();

  const searchRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Merge server + locally-created categories, apply type filter on local ones,
  // and remove any client-side deleted IDs.
  const allCategories = useMemo(() => {
    const base = categories.filter((c) => !deletedIds.has(c.id));
    const local = localCategories.filter(
      (c) =>
        !deletedIds.has(c.id) &&
        (!transactionType || c.type === transactionType || c.type === "both"),
    );
    return [...base, ...local];
  }, [categories, localCategories, deletedIds, transactionType]);

  const selected = allCategories.find((c) => c.id === value);

  const filtered = useMemo(
    () =>
      search.trim()
        ? allCategories.filter((c) =>
            c.name.toLowerCase().includes(search.toLowerCase())
          )
        : allCategories,
    [allCategories, search]
  );

  // Ensure portal renders only on client
  useEffect(() => { setMounted(true); }, []);

  // Reset state whenever picker opens
  useEffect(() => {
    if (open) {
      setSearch("");
      setView("list");
      setConfirmingDeleteId(null);
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    if (view === "create") {
      setNewName("");
      setNameError("");
      setSelectedIconKey("Tag");
      setSelectedColor(PRESET_COLORS[0]);
      setTimeout(() => nameInputRef.current?.focus(), 80);
    }
  }, [view]);

  // ── Intercept Escape in capture phase so it closes the picker but
  //    does NOT propagate to the parent Transaction dialog's handler.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        e.stopPropagation();
        handleClose();
      }
    }
    document.addEventListener("keydown", onKeyDown, /* capture */ true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    setOpen(false);
    onClose?.();
  }

  async function handleCreate(selectAndClose: boolean) {
    if (!newName.trim()) {
      setNameError("Name is required");
      return;
    }
    setNameError("");

    startTransition(async () => {
      const result = await createCategory({
        name: newName.trim(),
        color: selectedColor,
        icon: selectedIconKey,
        // New categories inherit the active tab type — never "both"
        type: transactionType ?? "expense",
      });

      if (result.error) {
        setNameError(result.error);
        return;
      }

      if (result.data) {
        const newCat: Category = {
          id: result.data.id,
          name: result.data.name,
          type: result.data.type as "income" | "expense" | "both",
          color: result.data.color,
          icon: result.data.icon,
          user_id: result.data.user_id,
          created_at: result.data.created_at,
        };
        setLocalCategories((prev) => [...prev, newCat]);

        if (selectAndClose) {
          onChange(result.data.id);
          handleClose();
        } else {
          setView("list");
        }
      }
    });
  }

  async function handleDelete(catId: string) {
    setIsDeleting(true);
    try {
      const result = await safeDeleteCategory(catId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      // Optimistically remove from local state
      setDeletedIds((prev) => new Set([...prev, catId]));
      setLocalCategories((prev) => prev.filter((c) => c.id !== catId));
      // Clear form selection if this category was selected
      if (value === catId) onChange("");
      setConfirmingDeleteId(null);
      toast.success("Category deleted");
    } finally {
      setIsDeleting(false);
    }
  }

  const SelectedIcon = selected ? getCategoryIcon(selected) : null;
  const PreviewIcon = ICON_REGISTRY[selectedIconKey] ?? Tag;

  // ── Portal overlay panel ────────────────────────────────────────────────
  const panel = (
    // Backdrop — clicking it closes ONLY the category picker
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onMouseDown={handleClose}
    >
      {/* Panel — stopPropagation so clicks inside don't hit the backdrop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={view === "list" ? "Choose category" : "Create category"}
        className="relative w-full max-w-sm rounded-xl bg-white border border-gray-200 shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {view === "list" ? (
          <>
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">
                Choose category
              </h3>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* ── Search ── */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search here"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-8 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* ── Category list ── */}
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50/80">
              {filtered.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">
                  No categories found
                </p>
              ) : (
                filtered.map((cat) => {
                  const Icon = getCategoryIcon(cat);
                  const isSelected = cat.id === value;
                  const isUserCat = Boolean(cat.user_id);
                  const isConfirming = confirmingDeleteId === cat.id;

                  return (
                    <div
                      key={cat.id}
                      className={cn(
                        "group flex items-center gap-3 px-4 py-3 text-sm transition-colors",
                        isSelected && !isConfirming
                          ? "bg-gray-50"
                          : isConfirming
                            ? "bg-red-50"
                            : "hover:bg-gray-50",
                      )}
                    >
                      {/* ── Icon ── */}
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          !isUserCat && isSelected && !isConfirming ? "bg-gray-200" : "bg-gray-100"
                        )}
                        style={isUserCat && isSelected && !isConfirming ? { backgroundColor: `${cat.color}1A` } : undefined}
                      >
                        <Icon
                          className={cn(
                            "size-4",
                            !isUserCat && "text-gray-500"
                          )}
                          style={
                            isUserCat && !isConfirming
                              ? { color: cat.color ?? undefined }
                              : undefined
                          }
                        />
                      </div>

                      {/* ── Name (selection target) ── */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isConfirming) return;
                          onChange(cat.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex-1 min-w-0 text-left font-medium truncate",
                          isSelected && !isConfirming
                            ? "text-gray-900 font-semibold"
                            : isConfirming
                              ? "text-red-700"
                              : "text-gray-700",
                        )}
                      >
                        {isConfirming ? (
                          <span className="text-xs font-semibold text-red-600">
                            Delete &ldquo;{cat.name}&rdquo;?
                          </span>
                        ) : (
                          cat.name
                        )}
                      </button>

                      {/* ── Right meta (user categories only) ── */}
                      {isUserCat && !isConfirming && (
                        <div className="flex items-center gap-1.5 shrink-0">

                          {/* Checkmark for selected */}
                          {isSelected && (
                            <Check className="size-4 text-gray-900 shrink-0" />
                          )}
                          {/* Trash — appears on row hover */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmingDeleteId(cat.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                            aria-label={`Delete ${cat.name}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      )}

                      {/* System category — just show checkmark */}
                      {!isUserCat && isSelected && (
                        <Check className="size-4 text-gray-900 shrink-0" />
                      )}

                      {/* ── Inline delete confirm ── */}
                      {isUserCat && isConfirming && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleDelete(cat.id)}
                            className="rounded-md bg-red-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-600 disabled:opacity-60 transition-colors"
                          >
                            {isDeleting ? "…" : "Delete"}
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => setConfirmingDeleteId(null)}
                            className="rounded-md px-2 py-1 text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* ── Footer ── */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/60 flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setView("create")}
                title="Create new category"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 shrink-0"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ── Create Category header ── */}
            <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-100">
              <button
                type="button"
                onClick={() => setView("list")}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="size-4" />
              </button>
              <h3 className="text-base font-semibold text-gray-900">
                Create category
              </h3>
              {transactionType && (
                <span
                  className={cn(
                    "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    transactionType === "income"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700",
                  )}
                >
                  {transactionType}
                </span>
              )}
            </div>

            {/* ── Icon grid ── */}
            <div className="h-56 overflow-y-auto p-3 border-b border-gray-100">
              <div className="grid grid-cols-6 gap-1.5">
                {ICON_LIST.map(({ key, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedIconKey(key)}
                    className={cn(
                      "flex h-10 w-full items-center justify-center rounded-lg transition-colors",
                      selectedIconKey === key
                        ? "ring-2 ring-offset-1"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-500"
                    )}
                    style={
                      selectedIconKey === key
                        ? { backgroundColor: `${selectedColor}18`, color: selectedColor }
                        : undefined
                    }
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* ── Bottom bar ── */}
            <div className="px-4 py-3 space-y-3">
              {/* Preview + color swatches */}
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${selectedColor}22` }}
                >
                  <PreviewIcon className="size-5" style={{ color: selectedColor }} />
                </div>
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className="h-5 w-5 rounded-full transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        outline: selectedColor === c ? `2px solid ${c}` : "none",
                        outlineOffset: "2px",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Name input */}
              <div>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); setNameError(""); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreate(true);
                    }
                  }}
                  placeholder="Category name"
                  className={cn(
                    "w-full rounded-lg border bg-gray-50 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors",
                    nameError ? "border-red-300" : "border-gray-200"
                  )}
                />
                {nameError && (
                  <p className="mt-1 text-xs text-red-500">{nameError}</p>
                )}
              </div>

              {/* Save button */}
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleCreate(false)}
                className="w-full rounded-lg bg-[#1E6B4E] py-2 text-sm font-semibold text-white transition-colors hover:bg-[#165a41] disabled:opacity-60"
              >
                {isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "w-full rounded-lg border bg-gray-50 px-3.5 py-2.5 text-sm text-left flex items-center gap-2.5 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E]",
          error ? "border-red-300" : "border-gray-200",
          selected ? "text-gray-900" : "text-gray-400"
        )}
      >
        {SelectedIcon && (
          <SelectedIcon 
            className={cn("size-4 shrink-0", !selected?.user_id && "text-gray-500")} 
            style={selected?.user_id ? { color: selected.color ?? undefined } : undefined}
          />
        )}
        <span className="flex-1 truncate">
          {selected ? selected.name : "Select category"}
        </span>
        <ChevronDown className="size-4 shrink-0 text-gray-400" />
      </button>

      {/* ── Portal — rendered to document.body, above the Transaction dialog ── */}
      {mounted && open && createPortal(panel, document.body)}
    </>
  );
}
