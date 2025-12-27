/**
 * Prompt Engineering Debug Page
 * Container page that handles routing between list, viewer, scorer, and golden dataset views
 */

import { useParams, useLocation } from 'react-router-dom';
import { SuiteList } from '@/components/PromptEngineering/SuiteList';
import { SuiteViewer } from '@/components/PromptEngineering/SuiteViewer';
import { ResponseScorer } from '@/components/PromptEngineering/ResponseScorer';
import { GoldenDatasetEditor } from '@/components/PromptEngineering/GoldenDatasetEditor';

export default function PromptEngineeringPage() {
  const { suiteId, promptId } = useParams<{ suiteId?: string; promptId?: string }>();
  const location = useLocation();

  // Route: /debug/prompt-engineering/golden-dataset -> GoldenDatasetEditor
  if (location.pathname === '/debug/prompt-engineering/golden-dataset') {
    return <GoldenDatasetEditor />;
  }

  // Route: /debug/prompt-engineering/:suiteId/:promptId -> ResponseScorer
  if (suiteId && promptId) {
    return <ResponseScorer suiteId={suiteId} promptId={promptId} />;
  }

  // Route: /debug/prompt-engineering/:suiteId -> SuiteViewer
  if (suiteId) {
    return <SuiteViewer suiteId={suiteId} />;
  }

  // Route: /debug/prompt-engineering -> SuiteList
  return <SuiteList />;
}
