// Mapping/business logic for issues module

import type { Issue, Attachment } from '@linear/sdk';
import type { SimplifiedIssueDetails } from './types.js';

export async function mapIssueToDetails(
  issue: Issue,
  includeAttachments = false,
): Promise<SimplifiedIssueDetails> {
  const [state, assignee, team, project, projectMilestone, labelsResult, attachmentsResult] =
    await Promise.all([
      issue.state,
      issue.assignee,
      issue.team,
      issue.project,
      issue.projectMilestone,
      issue.labels(),
      includeAttachments ? issue.attachments() : Promise.resolve(null),
    ]);

  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    description: issue.description,
    priority: issue.priority,
    state: state ? { id: state.id, name: state.name, color: state.color, type: state.type } : null,
    assignee: assignee ? { id: assignee.id, name: assignee.name, email: assignee.email } : null,
    team: team ? { id: team.id, name: team.name, key: team.key } : null,
    project: project ? { id: project.id, name: project.name } : null,
    projectMilestone: projectMilestone
      ? { id: projectMilestone.id, name: projectMilestone.name }
      : null,
    labels: labelsResult.nodes.map((l) => ({ id: l.id, name: l.name, color: l.color })),
    attachments:
      includeAttachments && attachmentsResult
        ? attachmentsResult.nodes.map((att: Attachment) => ({
            id: att.id,
            title: att.title,
            url: att.url,
            source: att.source,
            metadata: att.metadata,
            groupBySource: att.groupBySource,
            createdAt: att.createdAt,
            updatedAt: att.updatedAt,
          }))
        : undefined,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    url: issue.url,
  };
}