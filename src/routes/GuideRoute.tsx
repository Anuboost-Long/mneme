import { Navigate, useParams } from "react-router-dom";

import { findGuideTopic, guideTopics } from "../features/guide/lib/topics";
import GuidePage from "../features/guide/pages/GuidePage";

export default function GuideRoute() {
  const { topicId } = useParams();
  const topic = findGuideTopic(topicId);
  if (!topic) return <Navigate to={`/guide/${guideTopics[0].id}`} replace />;
  return <GuidePage topic={topic} />;
}
