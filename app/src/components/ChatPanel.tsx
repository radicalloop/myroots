import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSendChat } from '@/hooks/api/useFamilyTree';
import { useToast } from '@/providers/ToastProvider';
import { ChatMessage } from '@/types/chat.types';
import { createChatMessage, getWelcomeMessage, sanitizeAssistantMessage } from '@/utils/chat.utils';
import { theme } from '@/theme';

interface ChatPanelProps {
  treeId: string;
  treeName?: string;
  publicMode?: boolean;
}

export function ChatPanel({ treeId, treeName, publicMode }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [getWelcomeMessage(treeName)]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const sendChat = useSendChat(treeId, publicMode);
  const { showToast } = useToast();
  const previousMessages = useMemo(
    () => messages.slice(1).slice(-30).map(({ role, content }) => ({ role, content })),
    [messages]
  );

  const send = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setDraft('');
    setMessages((current) => [...current, createChatMessage('user', content)]);
    setSending(true);
    try {
      const response = await sendChat(content, undefined, previousMessages);
      setMessages((current) => [
        ...current,
        createChatMessage('assistant', sanitizeAssistantMessage(response.reply))
      ]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not send message', 'error');
      setMessages((current) => [
        ...current,
        createChatMessage('assistant', "Sorry, I couldn't process that request. Could you try rephrasing it?")
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Tree assistant</Text>
      <ScrollView style={styles.messages} contentContainerStyle={styles.messageContent}>
        {messages.map((message) => (
          <View
            key={message.id}
            style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}
          >
            <Text style={[styles.message, message.role === 'user' && styles.userMessage]}>{message.content}</Text>
          </View>
        ))}
        {sending ? <Text style={styles.typing}>Thinking...</Text> : null}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask about this tree..."
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          multiline
        />
        <Pressable onPress={send} style={styles.send}>
          <MaterialCommunityIcons name="send" size={18} color={theme.colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface
  },
  title: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900'
  },
  messages: {
    maxHeight: 280
  },
  messageContent: {
    gap: 8
  },
  bubble: {
    padding: 10,
    borderRadius: theme.radius.md,
    maxWidth: '88%'
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  message: {
    color: theme.colors.text,
    lineHeight: 20
  },
  userMessage: {
    color: theme.colors.white,
    fontWeight: '700'
  },
  typing: {
    color: theme.colors.textMuted,
    fontWeight: '700'
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.text
  },
  send: {
    height: 44,
    width: 44,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary
  }
});
