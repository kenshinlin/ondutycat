import { parseStringPromise } from "xml2js";

/**
 * 将指定标签的内容用 CDATA 包裹（如果尚未包含 CDATA）
 * @param xml - XML 字符串
 * @param tags - 需要处理的标签名数组
 * @returns 处理后的 XML 字符串
 */
function wrapTagsWithCDATA(xml: string, tags: string[]): string {
  let processedXml = xml;

  for (const tag of tags) {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "g");
    processedXml = processedXml.replace(
      regex,
      (_match: string, content: string) => {
        // 检查内容是否已经包含 CDATA
        if (content.includes("<![CDATA[")) {
          return `<${tag}>${content}</${tag}>`;
        }
        // 将内容包裹在 CDATA 中
        return `<${tag}><![CDATA[${content}]]></${tag}>`;
      },
    );
  }

  return processedXml;
}

/**
 * 将 XML 字符串转换为 JSON 对象
 * @param xml - XML 字符串
 * @returns JSON 对象
 */
export async function xmlToJSON<T = unknown>(xml: string): Promise<T> {
  try {
    // 首先尝试直接解析
    return (await parseStringPromise(xml, {
      explicitArray: false,
      mergeAttrs: true,
      trim: true,
      explicitRoot: false,
    })) as T;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // 如果直接解析失败，尝试修复常见问题
    console.warn(`XML 解析失败: ${errorMessage}，尝试修复...`);

    try {
      // 方案1: 只转义未转义的 & 符号
      const processedXml = xml.replace(
        /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);)/g,
        "&amp;",
      );

      return (await parseStringPromise(processedXml, {
        explicitArray: false,
        mergeAttrs: true,
        trim: true,
        explicitRoot: false,
      })) as T;
    } catch (error2) {
      const errorMessage =
        error2 instanceof Error ? error2.message : String(error2);

      // 方案2: 将标签内容包裹在 CDATA 中
      console.warn(`方案1失败: ${errorMessage}，尝试 CDATA 包裹...`);

      let processedXml = xml.replace(
        /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);)/g,
        "&amp;",
      );

      // 使用辅助函数包裹多个标签
      processedXml = wrapTagsWithCDATA(processedXml, [
        "content",
        "answer",
        "detailed_analysis",
      ]);

      return (await parseStringPromise(processedXml, {
        explicitArray: false,
        mergeAttrs: true,
        trim: true,
        explicitRoot: false,
      })) as T;
    }
  }
}
