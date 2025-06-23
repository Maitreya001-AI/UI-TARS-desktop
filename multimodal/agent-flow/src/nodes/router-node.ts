import { Node } from '../core/node';
import { SharedStore } from '../core/shared-store';
import { AnyData } from '../core/types';

export class RouterNode extends Node {
  private routes: Map<string, (input: AnyData, store: SharedStore) => boolean> = new Map();
  private defaultRoute: string | null = null;

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

  addRoute(route: string, condition: (input: AnyData, store: SharedStore) => boolean): RouterNode {
    this.routes.set(route, condition);
    return this;
  }

  setDefaultRoute(route: string): RouterNode {
    this.defaultRoute = route;
    return this;
  }
}
