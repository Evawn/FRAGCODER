/**
 * Golden Dataset Editor
 * View and edit the golden dataset entries used for prompt engineering evaluation
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { getGoldenDataset, addGoldenEntry, updateGoldenEntry, deleteGoldenEntry } from '@/api/promptEngineering';
import { GoldenEntryDialog } from './GoldenEntryDialog';
import type { GoldenPrompt } from '../../../../prompt-engineering/types';

function EntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: GoldenPrompt;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-4 border border-lines rounded-lg bg-background-header">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-mono text-xs font-light text-foreground-highlighted">{entry.id}</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0 text-error hover:text-error">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <p className="text-sm text-foregroundline-clamp-2 bg-background rounded-lg p-4">
        "{entry.input.prompt}"
      </p>

      {entry.notes && (
        <p className="text-xs text-foreground-muted italic p-2">
          {entry.notes}
        </p>
      )}

            {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs bg-accent-shadow rounded-lg">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function GoldenDatasetEditor() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<GoldenPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GoldenPrompt | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadDataset();
  }, []);

  const loadDataset = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const dataset = await getGoldenDataset();
      setEntries(dataset.prompts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load golden dataset');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingEntry(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (entry: GoldenPrompt) => {
    setEditingEntry(entry);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    try {
      setIsDeleting(true);
      await deleteGoldenEntry(deletingId);
      setEntries(prev => prev.filter(e => e.id !== deletingId));
      setDeletingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingId(null);
  };

  const handleSave = async (entry: GoldenPrompt) => {
    try {
      setIsSaving(true);
      if (editingEntry) {
        // Update existing entry
        await updateGoldenEntry(editingEntry.id, entry);
        setEntries(prev => prev.map(e => e.id === editingEntry.id ? entry : e));
      } else {
        // Add new entry
        const newEntry = await addGoldenEntry(entry);
        setEntries(prev => [...prev, newEntry]);
      }
      setIsDialogOpen(false);
      setEditingEntry(null);
    } catch (err) {
      throw err; // Let the dialog handle the error
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/debug/prompt-engineering')}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Suites
          </Button>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground-highlighted mb-2">
              Golden Dataset
            </h1>
            <p className="text-muted-foreground">
              {entries.length} test prompts for AI evaluation
            </p>
          </div>
          <Button onClick={handleAddNew} className="flex items-center gap-2">
            <Plus size={16} />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="border border-error rounded-lg p-4 bg-error/10 text-center">
          <p className="text-error">{error}</p>
          <Button variant="outline" onClick={loadDataset} className="mt-2">
            Retry
          </Button>
        </div>
      )}

      {/* Delete confirmation */}
      {deletingId && (
        <div className="mb-4 border border-error rounded-lg p-4 bg-error/10">
          <p className="text-foreground mb-3">
            Are you sure you want to delete <span className="font-mono">{deletingId}</span>?
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteCancel}
              disabled={isDeleting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && entries.length === 0 && (
        <div className="border border-dashed border-lines rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-2">No entries in the golden dataset.</p>
          <p className="text-sm text-muted-foreground mb-4">
            Add your first test prompt to get started.
          </p>
          <Button onClick={handleAddNew}>
            <Plus size={16} className="mr-2" />
            Add Entry
          </Button>
        </div>
      )}

      {/* Entry list */}
      {!isLoading && !error && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map(entry => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onEdit={() => handleEdit(entry)}
              onDelete={() => handleDeleteClick(entry.id)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <GoldenEntryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        entry={editingEntry}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
