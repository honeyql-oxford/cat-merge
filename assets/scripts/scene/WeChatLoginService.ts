import { sys } from 'cc';

export interface LoginProfile {
  platform: 'wechat-game' | 'mock';
  code: string;
  displayName: string;
  avatarUrl: string;
}

interface WeChatLoginResult {
  code?: string;
  errMsg?: string;
}

interface WeChatUserProfile {
  nickName?: string;
  avatarUrl?: string;
}

interface WeChatUserProfileResult {
  userInfo?: WeChatUserProfile;
  errMsg?: string;
}

interface WeChatApi {
  login(options: {
    success: (result: WeChatLoginResult) => void;
    fail: (error: unknown) => void;
  }): void;
  getUserProfile?(options: {
    desc: string;
    success: (result: WeChatUserProfileResult) => void;
    fail: (error: unknown) => void;
  }): void;
}

function getWeChatApi(): WeChatApi | null {
  const globalScope = globalThis as { wx?: WeChatApi };
  return globalScope.wx ?? null;
}

export class WeChatLoginService {
  isWeChatGameEnvironment(): boolean {
    return sys.platform === sys.Platform.WECHAT_GAME && !!getWeChatApi()?.login;
  }

  async login(): Promise<LoginProfile> {
    if (this.isWeChatGameEnvironment()) {
      return this.loginWithWeChat();
    }

    return this.loginWithMock();
  }

  private async loginWithWeChat(): Promise<LoginProfile> {
    const wxApi = getWeChatApi();
    if (!wxApi) {
      throw new Error('WeChat API is unavailable.');
    }

    const code = await new Promise<string>((resolve, reject) => {
      wxApi.login({
        success: (result) => {
          if (result.code) {
            resolve(result.code);
            return;
          }

          reject(new Error(result.errMsg ?? 'wx.login returned no code.'));
        },
        fail: (error) => {
          reject(error instanceof Error ? error : new Error('wx.login failed.'));
        },
      });
    });

    const userProfile = await this.tryGetUserProfile(wxApi);

    return {
      platform: 'wechat-game',
      code,
      displayName: userProfile?.nickName ?? '微信玩家',
      avatarUrl: userProfile?.avatarUrl ?? '',
    };
  }

  private async tryGetUserProfile(wxApi: WeChatApi): Promise<WeChatUserProfile | null> {
    if (!wxApi.getUserProfile) {
      return null;
    }

    try {
      return await new Promise<WeChatUserProfile | null>((resolve, reject) => {
        wxApi.getUserProfile?.({
          desc: '用于完成微信小游戏登录授权',
          success: (result) => {
            resolve(result.userInfo ?? null);
          },
          fail: (error) => {
            reject(error instanceof Error ? error : new Error('wx.getUserProfile failed.'));
          },
        });
      });
    } catch {
      return null;
    }
  }

  private async loginWithMock(): Promise<LoginProfile> {
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 250);
    });

    return {
      platform: 'mock',
      code: 'mock-login-code',
      displayName: '开发环境玩家',
      avatarUrl: '',
    };
  }
}
