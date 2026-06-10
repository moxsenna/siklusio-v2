import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Alert,
  ListRenderItem,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@/src/context/AuthContext";
import { useCommunityFeed, emptyReactionState } from "@/src/hooks/useCommunityFeed";
import { PostCard } from "@/src/features/community/PostCard";
import { ComposerModal } from "@/src/features/community/ComposerModal";
import { CommentsModal } from "@/src/features/community/CommentsModal";
import { ReportModal } from "@/src/features/community/ReportModal";
import { HeaderProfileButton } from "@/src/shared/components/HeaderProfileButton";
import { analytics } from "@/src/lib/analytics";
import { CommunityFeedItem } from "@/src/lib/communityTypes";

export default function CommunityScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const feed = useCommunityFeed(userId);

  const [composerOpen, setComposerOpen] = useState(false);

  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [commentsPostPreview, setCommentsPostPreview] = useState<string | null>(null);

  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportTargetType, setReportTargetType] = useState<"post" | "comment">("post");
  const [reportOpen, setReportOpen] = useState(false);

  const showError = (msg: string) => {
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert("Eror", msg);
  };

  const handleReact = useCallback(
    async (postId: string, rx: Parameters<typeof feed.toggleReaction>[1]) => {
      try {
        await feed.toggleReaction(postId, rx);
        analytics.logEvent("community_react", { reaction_type: rx });
      } catch (e: any) {
        showError(e?.message || "Gagal mengirim reaksi.");
      }
    },
    [feed],
  );

  const handleCreatePost = async (content: string) => {
    const res = await feed.createPost(content, false, null);
    analytics.logEvent("community_post_created");
    return res;
  };

  const handleCreateComment = async (postId: string, content: string) => {
    const res = await feed.createComment(postId, content, false);
    analytics.logEvent("community_comment_created");
    return res;
  };

  const handleOpenReport = (id: string, type: "post" | "comment") => {
    setReportTargetId(id);
    setReportTargetType(type);
    setReportOpen(true);
  };

  const handleOpenComments = useCallback((postId: string, preview: string) => {
    setCommentsPostId(postId);
    setCommentsPostPreview(preview);
  }, []);

  const handleCloseComments = () => {
    setCommentsPostId(null);
    setCommentsPostPreview(null);
  };

  const handleDeleteOwn = useCallback(
    async (postId: string) => {
      try {
        await feed.deleteOwnPost(postId);
      } catch (e: any) {
        showError(e?.message || "Gagal menghapus postingan.");
      }
    },
    [feed],
  );

  const handleEndReached = useCallback(() => {
    if (!feed.loading && feed.hasMore && !feed.refreshing) {
      feed.loadMore();
    }
  }, [feed.loading, feed.hasMore, feed.refreshing, feed.loadMore]);

  const renderItem: ListRenderItem<CommunityFeedItem> = useCallback(
    ({ item }) => (
      <PostCard
        post={item}
        reactions={feed.reactions[item.id] ?? emptyReactionState()}
        onReact={(rx) => handleReact(item.id, rx)}
        onOpenComments={() => handleOpenComments(item.id, item.content)}
        onReport={() => handleOpenReport(item.id, "post")}
        onDeleteOwn={() => handleDeleteOwn(item.id)}
      />
    ),
    [feed.reactions, handleReact, handleOpenComments, handleDeleteOwn],
  );

  const keyExtractor = useCallback((item: CommunityFeedItem) => item.id, []);

  const ListHeaderComponent = useMemo(
    () => (
      <>
        <View className="mb-6 pt-4 flex-row justify-between items-end border-b border-primary/20 pb-4">
          <View className="flex-1 pr-3">
            <Text className="text-3xl font-bold text-on-background">Komunitas</Text>
            <Text className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mt-1">
              Ruang Saling Mendukung
            </Text>
          </View>
          <HeaderProfileButton />
        </View>

        <TouchableOpacity
          onPress={() => setComposerOpen(true)}
          activeOpacity={0.9}
          className="bg-surface border border-outline-variant rounded-[24px] p-4 flex-row items-center gap-3.5 mb-2 shadow-sm active:scale-[0.99]"
        >
          <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center shrink-0">
            <Text className="text-lg">🌸</Text>
          </View>
          <View className="flex-1 bg-surface-variant border border-outline-variant/40 rounded-full px-4 py-3 justify-center">
            <Text className="text-xs text-on-surface-variant/70 font-medium">
              Bagikan cerita, curhat, atau info promil Bunda hari ini... ✨
            </Text>
          </View>
          <View className="w-8 h-8 rounded-full bg-primary/20 items-center justify-center shrink-0">
            <FontAwesome name="pencil" size={14} color="#ec4899" />
          </View>
        </TouchableOpacity>

        {feed.error ? (
          <View
            style={{
              backgroundColor: "#fef2f2",
              borderColor: "#fee2e2",
              borderWidth: 1,
              borderRadius: 16,
              padding: 14,
              flexDirection: "row",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <FontAwesome name="exclamation-triangle" size={18} color="#ef4444" />
            <Text style={{ fontSize: 12, color: "#ef4444", flex: 1 }}>{feed.error}</Text>
          </View>
        ) : null}
      </>
    ),
    [feed.error],
  );

  const ListEmptyComponent = useMemo(() => {
    if (feed.refreshing || feed.error) return null;

    return (
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 64,
          gap: 12,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: "#fce7f3",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "#fbcfe8",
          }}
        >
          <FontAwesome name="heart" size={28} color="#ec4899" />
        </View>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "bold",
            color: "#1e1b20",
            textAlign: "center",
          }}
        >
          Belum ada cerita di komunitas
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: 280,
            lineHeight: 19,
          }}
        >
          Jadilah yang pertama berbagi. Cerita kamu mungkin yang dibutuhkan orang lain.
        </Text>
        <TouchableOpacity
          onPress={() => setComposerOpen(true)}
          style={{
            marginTop: 6,
            backgroundColor: "#ec4899",
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 18,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "bold",
              color: "#fff",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Tulis Cerita Pertama
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [feed.refreshing, feed.error]);

  const ListFooterComponent = useMemo(() => {
    if (feed.loading && feed.posts.length > 0) {
      return (
        <View style={{ paddingVertical: 16, alignItems: "center" }}>
          <ActivityIndicator size="small" color="#ec4899" />
        </View>
      );
    }

    if (!feed.hasMore && feed.posts.length > 0) {
      return (
        <Text
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "#cbd5e1",
            paddingVertical: 16,
          }}
        >
          ✦ Sampai di sini dulu ✦
        </Text>
      );
    }

    return null;
  }, [feed.loading, feed.posts.length, feed.hasMore]);

  const ItemSeparatorComponent = useCallback(
    () => <View style={{ height: 12 }} />,
    [],
  );

  return (
    <SafeAreaView
      style={{ flex: 1, minHeight: Platform.OS === "web" ? "100%" : undefined }}
      className="bg-background"
    >
      <FlatList
        data={feed.posts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        ItemSeparatorComponent={ItemSeparatorComponent}
        contentContainerStyle={{
          padding: 24,
          paddingBottom: 100,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={feed.refreshing}
            onRefresh={feed.refresh}
            tintColor="#ec4899"
            colors={["#ec4899"]}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.2}
      />

      <ComposerModal
        visible={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSubmit={handleCreatePost}
        cooldownLeft={feed.postCooldownLeft}
      />

      <CommentsModal
        visible={commentsPostId !== null}
        postId={commentsPostId}
        postPreview={commentsPostPreview}
        onClose={handleCloseComments}
        fetchComments={feed.fetchComments}
        onCreateComment={handleCreateComment}
        onReportComment={(commentId, reason) => feed.reportTarget("comment", commentId, reason)}
        cooldownLeft={feed.commentCooldownLeft}
      />

      <ReportModal
        visible={reportOpen}
        targetId={reportTargetId}
        targetType={reportTargetType}
        onClose={() => {
          setReportOpen(false);
          setReportTargetId(null);
        }}
        onSubmit={feed.reportTarget}
      />
    </SafeAreaView>
  );
}