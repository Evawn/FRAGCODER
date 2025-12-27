/**
 * Prompt Engineering Debug Page
 * Container page that handles routing between list, viewer, and scorer views
 */

import { useParams } from 'react-router-dom';
import { SuiteList } from '@/components/PromptEngineering/SuiteList';
import { SuiteViewer } from '@/components/PromptEngineering/SuiteViewer';
import { ResponseScorer } from '@/components/PromptEngineering/ResponseScorer';

export default function PromptEngineeringPage() {
  const { suiteId, promptId } = useParams<{ suiteId?: string; promptId?: string }>();

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
