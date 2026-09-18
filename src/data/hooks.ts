import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FeedKind, ID } from './types';
import { useApi } from './provider';

export const keys = {
  me: ['me'],
  today: ['today'],
  catalogue: ['catalogue'],
  commitments: ['commitments'],
  crews: ['crews'],
  crew: (id: ID) => ['crew', id],
  feed: (kind: FeedKind) => ['feed', kind],
  comments: (postId: ID) => ['comments', postId],
  profileStats: ['profileStats'],
};

export function useMe() {
  const api = useApi();
  return useQuery({ queryKey: keys.me, queryFn: () => api.getMe() });
}

export function useToday() {
  const api = useApi();
  return useQuery({ queryKey: keys.today, queryFn: () => api.today() });
}

export function useCatalogue() {
  const api = useApi();
  return useQuery({ queryKey: keys.catalogue, queryFn: () => api.listCatalogue() });
}

export function useMyCommitments() {
  const api = useApi();
  return useQuery({ queryKey: keys.commitments, queryFn: () => api.myCommitments() });
}

export function useMyCrews() {
  const api = useApi();
  return useQuery({ queryKey: keys.crews, queryFn: () => api.myCrews() });
}

export function useCrewDetail(id: ID) {
  const api = useApi();
  return useQuery({ queryKey: keys.crew(id), queryFn: () => api.crewDetail(id) });
}

export function useFeed(kind: FeedKind) {
  const api = useApi();
  return useQuery({ queryKey: keys.feed(kind), queryFn: () => api.feed(kind) });
}

export function useComments(postId: ID) {
  const api = useApi();
  return useQuery({ queryKey: keys.comments(postId), queryFn: () => api.comments(postId) });
}

export function useProfileStats() {
  const api = useApi();
  return useQuery({ queryKey: keys.profileStats, queryFn: () => api.profileStats() });
}

/** Invalidate every feed-scoped query after a keep/comment/reaction. */
function useInvalidateCore() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: keys.today });
    void qc.invalidateQueries({ queryKey: keys.me });
    void qc.invalidateQueries({ queryKey: keys.commitments });
    void qc.invalidateQueries({ queryKey: keys.crews });
    void qc.invalidateQueries({ queryKey: keys.profileStats });
    void qc.invalidateQueries({ queryKey: ['feed'] });
    void qc.invalidateQueries({ queryKey: ['crew'] });
  };
}

export function useSubmitKeep() {
  const api = useApi();
  const invalidate = useInvalidateCore();
  return useMutation({
    mutationFn: api.submitKeep.bind(api),
    onSuccess: invalidate,
  });
}

export function useAddComment(postId: ID) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.addComment(postId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.comments(postId) });
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useToggleReaction() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, emoji }: { postId: ID; emoji: string }) => api.toggleReaction(postId, emoji),
    onMutate: async ({ postId, emoji }) => {
      await qc.cancelQueries({ queryKey: ['feed'] });
      const snapshots = qc.getQueriesData<import('./types').ProofPost[]>({ queryKey: ['feed'] });
      qc.setQueriesData<import('./types').ProofPost[]>({ queryKey: ['feed'] }, (old) =>
        old?.map((p) => {
          if (p.id !== postId) return p;
          const reactions = [...p.reactions];
          const idx = reactions.findIndex((r) => r.emoji === emoji);
          if (idx >= 0 && reactions[idx].mine) {
            reactions[idx] = { ...reactions[idx], count: reactions[idx].count - 1, mine: false };
            return { ...p, reactions: reactions.filter((r) => r.count > 0) };
          }
          if (idx >= 0) reactions[idx] = { ...reactions[idx], count: reactions[idx].count + 1, mine: true };
          else reactions.push({ emoji, count: 1, mine: true });
          return { ...p, reactions };
        }),
      );
      return { snapshots };
    },
    onError: (_e, _v, ctx) => {
      for (const [key, data] of ctx?.snapshots ?? []) qc.setQueryData(key, data);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export function useAddCommitment() {
  const api = useApi();
  const invalidate = useInvalidateCore();
  return useMutation({ mutationFn: api.addCommitment.bind(api), onSuccess: invalidate });
}

export function useArchiveCommitment() {
  const api = useApi();
  const invalidate = useInvalidateCore();
  return useMutation({ mutationFn: api.archiveCommitment.bind(api), onSuccess: invalidate });
}

export function useCreateCrew() {
  const api = useApi();
  const invalidate = useInvalidateCore();
  return useMutation({ mutationFn: api.createCrew.bind(api), onSuccess: invalidate });
}

export function useJoinCrew() {
  const api = useApi();
  const invalidate = useInvalidateCore();
  return useMutation({ mutationFn: api.joinCrew.bind(api), onSuccess: invalidate });
}

export function useLeaveCrew() {
  const api = useApi();
  const invalidate = useInvalidateCore();
  return useMutation({ mutationFn: api.leaveCrew.bind(api), onSuccess: invalidate });
}

export function useUpdateProfile() {
  const api = useApi();
  const invalidate = useInvalidateCore();
  return useMutation({ mutationFn: api.updateProfile.bind(api), onSuccess: invalidate });
}
