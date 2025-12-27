/**
 * Dialog for creating a new test suite
 * Allows user to enter description and select model before running
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
import type { ResponseSuite } from '../../../../prompt-engineering/types';
import { runNewSuite } from '@/data/promptEngineeringSuites';
import { Loader2 } from 'lucide-react';

interface NewSuiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuiteCreated: (suite: ResponseSuite) => void;
  onRunningChange: (running: boolean) => void;
}

export function NewSuiteDialog({
  open,
  onOpenChange,
  onSuiteCreated,
  onRunningChange,
}: NewSuiteDialogProps) {
  const [description, setDescription] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL_ID);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    setError(null);
    setIsRunning(true);
    onRunningChange(true);

    try {
      const suite = await runNewSuite(description.trim(), model);
      onSuiteCreated(suite);
      onOpenChange(false);
      // Reset form
      setDescription('');
      setModel(DEFAULT_MODEL_ID);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run suite');
    } finally {
      setIsRunning(false);
      onRunningChange(false);
    }
  };

  const handleClose = () => {
    if (!isRunning) {
      onOpenChange(false);
      setError(null);
    }
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
              disabled={isRunning}
            />
            <p className="text-xs text-muted-foreground">
              Describe what you're testing or changed in this run.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={model} onValueChange={setModel} disabled={isRunning}>
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
          <Button variant="outline" onClick={handleClose} disabled={isRunning}>
            Cancel
          </Button>
          <Button onClick={handleRun} disabled={isRunning || !description.trim()}>
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              'Run Suite'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
