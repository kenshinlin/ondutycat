/**
 * 应用配置文件
 *
 * 注意：
 * - 生产环境请修改以下配置
 * - 敏感信息应该通过环境变量设置
 */

export const settings = {
  // Supabase 配置
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  },

  // 应用 URL
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
} as const;

// 类型导出
export type Settings = typeof settings;
