import { IMType } from '@prisma/client';

export interface IMMessage {
  title: string;
  description?: string;
  severity: string;
  source: string;
  alertId: string;
}

export interface SendResult {
  success: boolean;
  error?: string;
}

/**
 * Send alert message to Slack
 */
export async function sendToSlack(
  webhookUrl: string,
  message: IMMessage
): Promise<SendResult> {
  try {
    const colorMap: Record<string, string> = {
      critical: '#FF0000',
      high: '#FF6600',
      medium: '#FFCC00',
      low: '#36A64F',
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attachments: [
          {
            color: colorMap[message.severity] || '#808080',
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: `🚨 ${message.title}`,
                  emoji: true,
                },
              },
              {
                type: 'section',
                fields: [
                  {
                    type: 'mrkdwn',
                    text: `*Severity:*\n${message.severity.toUpperCase()}`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Source:*\n${message.source}`,
                  },
                ],
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Slack API error: ${response.status} ${response.statusText}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send alert message to Slack using bot token
 */
export async function sendToSlackWithBot(
  botToken: string,
  channelId: string,
  message: IMMessage
): Promise<SendResult> {
  try {
    const colorMap: Record<string, string> = {
      critical: '#FF0000',
      high: '#FF6600',
      medium: '#FFCC00',
      low: '#36A64F',
    };

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${botToken}`,
      },
      body: JSON.stringify({
        channel: channelId,
        attachments: [
          {
            color: colorMap[message.severity] || '#808080',
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: `🚨 ${message.title}`,
                  emoji: true,
                },
              },
              {
                type: 'section',
                fields: [
                  {
                    type: 'mrkdwn',
                    text: `*Severity:*\n${message.severity.toUpperCase()}`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Source:*\n${message.source}`,
                  },
                ],
              },
              ...(message.description
                ? [
                    {
                      type: 'section' as const,
                      text: {
                        type: 'mrkdwn' as const,
                        text: message.description,
                      },
                    },
                  ]
                : []),
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      return {
        success: false,
        error: `Slack API error: ${data.error || 'Unknown error'}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send alert message to Lark (Feishu)
 */
export async function sendToLark(
  webhookUrl: string,
  message: IMMessage
): Promise<SendResult> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        msg_type: 'interactive',
        card: {
          header: {
            title: {
              tag: 'plain_text',
              content: `🚨 ${message.title}`,
            },
            template: getLarkColorTemplate(message.severity),
          },
          elements: [
            {
              tag: 'div',
              fields: [
                {
                  is_short: true,
                  text: {
                    tag: 'lark_md',
                    content: `**Severity:**\n${message.severity.toUpperCase()}`,
                  },
                },
                {
                  is_short: true,
                  text: {
                    tag: 'lark_md',
                    content: `**Source:**\n${message.source}`,
                  },
                },
              ],
            },
            ...(message.description
              ? [
                  {
                    tag: 'div',
                    text: {
                      tag: 'lark_md',
                      content: message.description,
                    },
                  },
                ]
              : []),
          ],
        },
      }),
    });

    const data = await response.json();

    if (data.code !== 0) {
      return {
        success: false,
        error: `Lark API error: ${data.msg || 'Unknown error'}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send alert message to Lark using bot token
 */
export async function sendToLarkWithBot(
  botToken: string,
  openChatId: string,
  message: IMMessage
): Promise<SendResult> {
  try {
    const response = await fetch(
      'https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${botToken}`,
        },
        body: JSON.stringify({
          receive_id: openChatId,
          msg_type: 'interactive',
          content: JSON.stringify({
            type: 'template',
            data: {
              type: 'template',
              template_id: 'default',
              template_variable: {
                title: `🚨 ${message.title}`,
                severity: message.severity.toUpperCase(),
                source: message.source,
                description: message.description || '',
              },
            },
          }),
        }),
      }
    );

    const data = await response.json();

    if (data.code !== 0) {
      return {
        success: false,
        error: `Lark API error: ${data.msg || 'Unknown error'}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function getLarkColorTemplate(severity: string): string {
  const templateMap: Record<string, string> = {
    critical: 'red',
    high: 'orange',
    medium: 'yellow',
    low: 'green',
  };
  return templateMap[severity] || 'blue';
}

/**
 * Send alert message to IM platform
 */
export async function sendAlertToIM(params: {
  imType: IMType;
  webhookUrl?: string | null;
  botToken?: string | null;
  destinationId?: string | null;
  message: IMMessage;
}): Promise<SendResult> {
  const { imType, webhookUrl, botToken, destinationId, message } = params;

  // Prefer webhook URL if available (simpler integration)
  if (webhookUrl) {
    if (imType === 'slack') {
      return sendToSlack(webhookUrl, message);
    } else if (imType === 'lark') {
      return sendToLark(webhookUrl, message);
    }
  }

  // Use bot token if webhook URL is not available
  if (botToken && destinationId) {
    if (imType === 'slack') {
      return sendToSlackWithBot(botToken, destinationId, message);
    } else if (imType === 'lark') {
      return sendToLarkWithBot(botToken, destinationId, message);
    }
  }

  return {
    success: false,
    error: 'No valid webhook URL or bot token configuration found',
  };
}
