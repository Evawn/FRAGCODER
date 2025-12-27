/**
 * Dialog for creating a new test suite
 * Allows user to enter description and select model before running
 * Dialog closes immediately on submit - parent manages the actual run
 */

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AVAILABLE_AI_MODELS, DEFAULT_MODEL_ID } from '@fragcoder/shared';

interface NewSuiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartRun: (description: string, model: string) => void;
}

export function NewSuiteDialog({
  open,
  onOpenChange,
  onStartRun,
}: NewSuiteDialogProps) {
  const [description, setDescription] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL_ID);
  const [error, setError] = useState<string | null>(null);

  const handleRun = () => {
    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    // Close dialog immediately and let parent handle the run
    const desc = description.trim();
    const selectedModel = model;

    // Reset form
    setDescription('');
    setModel(DEFAULT_MODEL_ID);
    setError(null);

    // Close dialog and start run
    onOpenChange(false);
    onStartRun(desc, selectedModel);
  };

  const handleClose = () => {
    onOpenChange(false);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Run New Test Suite</DialogTitle>
          <DialogDescription>
            Run the golden dataset prompts through the AI pipeline and save results for evaluation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="e.g., Added chain-of-thought prompting"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Describe what you're testing or changed in this run.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_AI_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({m.provider})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-error">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleRun} disabled={!description.trim()}>
            Run Suite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
