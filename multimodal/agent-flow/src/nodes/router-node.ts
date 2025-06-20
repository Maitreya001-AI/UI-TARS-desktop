/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Node } from '../core/node';
import { SharedStore } from '../core/shared-store';
import { AnyData } from '../core/types';

/**
 * RouterNode - 用于在不同节点之间进行路由的节点
 *
 * 该节点可以根据输入或存储中的状态，决定执行流程应该走哪个分支。
 */
export class RouterNode extends Node {
  private routes: Map<string, (input: AnyData, store: SharedStore) => boolean> = new Map();
  private defaultRoute: string | null = null;

  /**
   * 构造函数
   *
   * @param id 节点 ID
   */
  constructor(id: string) {
    super(id, async (input, store) => {
      // 记录所有匹配的路由
      const matchedRoutes: string[] = [];

      // 检查所有路由条件
      for (const [route, condition] of this.routes.entries()) {
        if (condition(input, store)) {
          matchedRoutes.push(route);
        }
      }

      // 如果有匹配的路由，返回第一个
      if (matchedRoutes.length > 0) {
        return {
          input,
          route: matchedRoutes[0],
          allMatches: matchedRoutes,
        };
      }

      // 如果没有匹配的路由，返回默认路由
      if (this.defaultRoute) {
        return {
          input,
          route: this.defaultRoute,
          isDefault: true,
        };
      }

      // 如果没有默认路由，返回错误
      return {
        input,
        error: 'No matching route found',
        routingFailed: true,
      };
    });
  }

  /**
   * 添加路由
   *
   * @param route 路由名称
   * @param condition 路由条件
   * @returns this (链式调用)
   */
  addRoute(route: string, condition: (input: AnyData, store: SharedStore) => boolean): RouterNode {
    this.routes.set(route, condition);
    return this;
  }

  /**
   * 设置默认路由
   *
   * @param route 默认路由名称
   * @returns this (链式调用)
   */
  setDefaultRoute(route: string): RouterNode {
    this.defaultRoute = route;
    return this;
  }
}
