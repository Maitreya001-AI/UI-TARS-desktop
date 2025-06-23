/**
 * 智能提示构建器
 *
 * 帮助构建和组织代理使用的提示。
 */
export class PromptBuilder {
  private sections: Map<string, string> = new Map();
  private order: string[] = [];

  /**
   * 添加提示部分
   *
   * @param id 部分 ID
   * @param content 部分内容
   * @param position 部分位置
   * @returns this (链式调用)
   */
  addSection(id: string, content: string, position?: number): PromptBuilder {
    // 保存内容
    this.sections.set(id, content);

    // 如果已存在，先移除
    const existingIndex = this.order.indexOf(id);
    if (existingIndex !== -1) {
      this.order.splice(existingIndex, 1);
    }

    // 添加到指定位置或末尾
    if (position !== undefined && position >= 0 && position <= this.order.length) {
      this.order.splice(position, 0, id);
    } else {
      this.order.push(id);
    }

    return this;
  }

  /**
   * 移除提示部分
   *
   * @param id 部分 ID
   * @returns this (链式调用)
   */
  removeSection(id: string): PromptBuilder {
    this.sections.delete(id);

    const index = this.order.indexOf(id);
    if (index !== -1) {
      this.order.splice(index, 1);
    }

    return this;
  }

  /**
   * 获取提示部分
   *
   * @param id 部分 ID
   * @returns 部分内容或 undefined
   */
  getSection(id: string): string | undefined {
    return this.sections.get(id);
  }

  /**
   * 构建提示
   *
   * @param separator 分隔符
   * @returns 构建的提示
   */
  build(separator = '\n\n'): string {
    // 按顺序添加各部分
    return this.order
      .map((id) => this.sections.get(id))
      .filter(Boolean)
      .join(separator);
  }

  /**
   * 清空提示
   *
   * @returns this (链式调用)
   */
  clear(): PromptBuilder {
    this.sections.clear();
    this.order = [];
    return this;
  }

  /**
   * 添加系统指令
   *
   * @param content 指令内容
   * @returns this (链式调用)
   */
  addSystemInstruction(content: string): PromptBuilder {
    return this.addSection('system_instruction', content, 0);
  }

  /**
   * 添加角色定义
   *
   * @param content 角色定义
   * @returns this (链式调用)
   */
  addRoleDefinition(content: string): PromptBuilder {
    return this.addSection('role_definition', content, 1);
  }

  /**
   * 添加工具描述
   *
   * @param content 工具描述
   * @returns this (链式调用)
   */
  addTools(content: string): PromptBuilder {
    return this.addSection('tools', content);
  }

  /**
   * 添加上下文
   *
   * @param content 上下文内容
   * @returns this (链式调用)
   */
  addContext(content: string): PromptBuilder {
    return this.addSection('context', content);
  }

  /**
   * 添加示例
   *
   * @param content 示例内容
   * @returns this (链式调用)
   */
  addExamples(content: string): PromptBuilder {
    return this.addSection('examples', content);
  }

  /**
   * 添加约束
   *
   * @param content 约束内容
   * @returns this (链式调用)
   */
  addConstraints(content: string): PromptBuilder {
    return this.addSection('constraints', content);
  }

  /**
   * 添加输出格式
   *
   * @param content 输出格式
   * @returns this (链式调用)
   */
  addOutputFormat(content: string): PromptBuilder {
    return this.addSection('output_format', content);
  }

  /**
   * 添加用户查询
   *
   * @param content 用户查询
   * @returns this (链式调用)
   */
  addUserQuery(content: string): PromptBuilder {
    return this.addSection('user_query', content);
  }
}
