import React from 'react';
import { View, Text, TouchableOpacity, Alert, Platform, Image } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  CommunityFeedItem,
  REACTION_TYPES,
  REACTION_EMOJI,
  REACTION_LABEL,
  ReactionType,
} from '../../src/lib/communityTypes';
import { resolveAvatarSource } from '../../src/lib/avatars';
import { PostReactionState } from '../../src/hooks/useCommunityFeed';

interface PostCardProps {
  post: CommunityFeedItem;
  reactions: PostReactionState;
  onReact: (reactionType: ReactionType) => void;
  onOpenComments: () => void;
  onReport: () => void;
  onDeleteOwn: () => void;
}

export function PostCard({
  post,
  reactions,
  onReact,
  onOpenComments,
  onReport,
  onDeleteOwn,
}: PostCardProps) {
  const dateLabel = (() => {
    try {
      return format(new Date(post.created_at), "d MMM 'pukul' HH:mm", {
        locale: localeId,
      });
    } catch {
      return post.created_at;
    }
  })();

  const handleDelete = () => {
    const performDelete = () => onDeleteOwn();
    if (Platform.OS === 'web') {
      if (window.confirm('Hapus postingan ini? Tindakan tidak dapat dibatalkan.')) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Hapus Postingan',
        'Hapus postingan ini? Tindakan tidak dapat dibatalkan.',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Hapus', style: 'destructive', onPress: performDelete },
        ]
      );
    }
  };

  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#f1e6eb',
        padding: 18,
        gap: 12,
      }}
    >
      {/* Header: identitas + waktu + menu */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {post.is_anonymous ? (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#e2e8f0',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FontAwesome
              name="user-secret"
              size={16}
              color="#64748b"
            />
          </View>
        ) : (
          (() => {
            const src = resolveAvatarSource(
              post.avatar_url,
              post.avatar_url?.startsWith('preset:') ? 'preset' : 'custom'
            );
            if (src) {
              return (
                <Image
                  source={src}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: '#fce7f3',
                  }}
                />
              );
            }
            return (
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#fce7f3',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FontAwesome name="user" size={16} color="#ec4899" />
              </View>
            );
          })()
        )}

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1e1b20' }}>
            {post.display_name}
          </Text>
          <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            {dateLabel}
            {post.phase_tag ? ` · ${post.phase_tag}` : ''}
          </Text>
        </View>

        {post.is_own ? (
          <TouchableOpacity
            onPress={handleDelete}
            accessibilityLabel="Hapus postingan"
            style={{ padding: 6 }}
          >
            <FontAwesome name="trash-o" size={16} color="#94a3b8" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onReport}
            accessibilityLabel="Laporkan postingan"
            style={{ padding: 6 }}
          >
            <FontAwesome name="flag-o" size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <Text
        style={{
          fontSize: 14,
          lineHeight: 21,
          color: '#1e1b20',
        }}
      >
        {post.content}
      </Text>

      {/* Reactions row */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 6,
          marginTop: 4,
        }}
      >
        {REACTION_TYPES.map((rx) => {
          const count = reactions.counts[rx] || 0;
          const mine = reactions.mine.has(rx);
          return (
            <TouchableOpacity
              key={rx}
              onPress={() => onReact(rx)}
              accessibilityLabel={`Reaksi ${REACTION_LABEL[rx]}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 16,
                backgroundColor: mine ? '#fce7f3' : '#f8fafc',
                borderWidth: 1,
                borderColor: mine ? '#ec4899' : '#f1e6eb',
              }}
            >
              <Text style={{ fontSize: 14 }}>{REACTION_EMOJI[rx]}</Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: 'bold',
                  color: mine ? '#ec4899' : '#64748b',
                }}
              >
                {count}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer actions */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#f8fafc',
        }}
      >
        <TouchableOpacity
          onPress={onOpenComments}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 14,
            backgroundColor: '#f8fafc',
          }}
        >
          <FontAwesome name="comment-o" size={14} color="#64748b" />
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748b' }}>
            {post.comment_count} Komentar
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
