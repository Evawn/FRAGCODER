/**
 * Dialog for adding/editing a golden dataset entry
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Loader2 } from 'lucide-react';
import type { GoldenPrompt } from '../../../../prompt-engineering/types';
import type { AIIntent } from '@fragcoder/shared';

interface GoldenEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: GoldenPrompt | null;
  onSave: (entry: GoldenPrompt) => Promise<void>;
  isSaving: boolean;
}

const INTENT_OPTIONS: { value: AIIntent | 'none'; label: string }[] = [
  { value: 'none', label: 'None (auto-detect)' },
  { value: 'new_shader', label: 'New Shader' },
  { value: 'modify', label: 'Modify' },
  { value: 'debug', label: 'Debug' },
  { value: 'explain', label: 'Explain' },
];

function generateIdFromPrompt(prompt: string): string {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join('_');
}

export function GoldenEntryDialog({
  open,
  onOpenChange,
  entry,
  onSave,
  isSaving,
}: GoldenEntryDialogProps) {
  const isEditing = !!entry;

  // Form state
  const [id, setId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [code, setCode] = useState('');
  const [intent, setIntent] = useState<AIIntent | 'none'>('none');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset form when entry changes
  useEffect(() => {
    if (entry) {
      setId(entry.id);
      setPrompt(entry.input.prompt);
      setCode(entry.input.code || '');
      setIntent(entry.input.intent || 'none');
      setNotes(entry.notes);
      setTags(entry.tags);
      setExpectedBehavior(entry.expectedBehavior || '');
    } else {
      setId('');
      setPrompt('');
      setCode('');
      setIntent('none');
      setNotes('');
      setTags([]);
      setExpectedBehavior('');
    }
    setTagInput('');
    setError(null);
  }, [entry, open]);

  // Auto-generate ID from prompt when creating new entry
  useEffect(() => {
    if (!isEditing && prompt && !id) {
      setId(generateIdFromPrompt(prompt));
    }
  }, [prompt, isEditing, id]);

  const handleAddTag = () => {
    const newTag = tagInput.trim().toLowerCase();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSave = async () => {
    // Validation
    if (!id.trim()) {
      setError('ID is required');
      return;
    }
    if (!prompt.trim()) {
      setError('Prompt is required');
      return;
    }

    const newEntry: GoldenPrompt = {
      id: id.trim(),
      input: {
        prompt: prompt.trim(),
        ...(code.trim() && { code: code.trim() }),
        ...(intent !== 'none' && { intent }),
      },
      notes: notes.trim(),
      tags,
      ...(expectedBehavior.trim() && { expectedBehavior: expectedBehavior.trim() }),
    };

    try {
      await onSave(newEntry);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry');
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="xl" className="max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-lines shrink-0">
          <DialogTitle className="text-lg">{isEditing ? 'Edit Entry' : 'Add New Entry'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update this golden dataset entry.'
              : 'Add a new test prompt to the golden dataset.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            {/* Left column - Core fields */}
            <div className="space-y-6">
              {/* ID */}
              <div className="space-y-2">
                <Label htmlFor="id" className="text-sm font-medium">ID</Label>
                <Input
                  id="id"
                  placeholder="e.g., raytracing_3d_primitives"
                  value={id}
                  onChange={(e) => setId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Auto-generated from prompt if left empty
                </p>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <Label htmlFor="prompt" className="text-sm font-medium">Prompt *</Label>
                <Textarea
                  id="prompt"
                  placeholder="Enter the test prompt..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Code Context */}
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-medium">Code Context</Label>
                <Textarea
                  id="code"
                  placeholder="Optional GLSL code to provide as context..."
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  rows={6}
                  className="font-mono text-xs resize-none"
                />
              </div>
            </div>

            {/* Right column - Metadata */}
            <div className="space-y-6">
              {/* Intent */}
              <div className="space-y-2">
                <Label htmlFor="intent" className="text-sm font-medium">Intent</Label>
                <Select value={intent} onValueChange={(v) => setIntent(v as AIIntent | 'none')}>
                  <SelectTrigger id="intent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTENT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    className="text-sm"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs pl-2 pr-1 py-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1.5 hover:text-error transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Notes about what this prompt tests..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>

              {/* Expected Behavior */}
              <div className="space-y-2">
                <Label htmlFor="expectedBehavior" className="text-sm font-medium">Expected Behavior</Label>
                <Textarea
                  id="expectedBehavior"
                  placeholder="Describe what correct output should look like..."
                  value={expectedBehavior}
                  onChange={(e) => setExpectedBehavior(e.target.value)}
                  rows={4}
                  className="resize-none text-sm"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-error mt-4">{error}</p>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-lines shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !prompt.trim()}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              isEditing ? 'Save Changes' : 'Add Entry'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
