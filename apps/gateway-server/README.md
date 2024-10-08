<!-- TOC -->

- [compass nest template](#compass-nest-template)
  - [特性](#特性) - [支持读取配置文件](#支持读取配置文件) - [Typescript/Jest/Airbnb Eslint/Prettier](#typescriptjestairbnb-eslintprettier) - [接口多版本支持](#接口多版本支持) - [接口限流保护](#接口限流保护) - [约束接口进参,移除非白名单属性,自动转换数据为符合预期的类型](#约束接口进参移除非白名单属性自动转换数据为符合预期的类型) - [支持Swagger API文档](#支持swagger-api文档) - [基于Docker快速构建分发](#基于docker快速构建分发) - [默认提供Github Actions文件进行自动lint和部署](#默认提供github-actions文件进行自动lint和部署) - [统一的响应拦截器,规范返回数据](#统一的响应拦截器规范返回数据) - [JWT Token处理](#jwt-token处理) - [微服务模式](#微服务模式) - [独立服务模式](#独立服务模式) - [支持连接到Redis](#支持连接到redis) - [支持使用 Email](#支持使用-email) - [支持Google reCAPTCHA v3 人机校验](#支持google-recaptcha-v3-人机校验) - [支持Mysql](#支持mysql)
  <!-- TOC -->

# compass nest template

## 特性

### 支持读取配置文件

```typescript
import { getEnvConfig } from '@app/common';

console.log('所有配置变量: ', getEnvConfig());
console.log('指定配置变量: ', getEnvConfig('NODE_ENV'));
```

配置文件默认读取程序执行目录下的.env文件,需要修改配置路径提供ENV_FILE_PATH环境变量即可, 内部取值: `process.env.ENV_FILE_PATH || path.join(process.cwd(), '.env')`

所有可用的环境变量`.env.example`文件使用. 类型与schema约束分别位于`libs/common/src/interfaces/environment.ts`和`libs/common/src/config/env-config.ts`

当需要新增环境变量时建议:

1. .env.example 文件更新示例说明
2. `libs/common/src/interfaces/environment.ts` 类型文件更新定义
3. `libs/common/src/config/env-config.ts` schema定义更新,清洗转化数据

### Typescript/Jest/Airbnb Eslint/Prettier

- 支持Typescript环境
- `npm run format` 进行代码格式化
- `npm run lint` 进行代码检查,默认基于Airbnb规范
- `npm run test` 进行单元测试
- `npm run test:e2e` 进行端到端测试

### 接口多版本支持

用法示例如下:

```typescript
@Controller('example')
export class ExampleController {
  // 访问地址: /api/v1/example/test
  @Get('test')
  test(): string {
    return 'This is v1 endpoint.';
  }

  // 访问地址: /api/v2/example/test
  @Version('2')
  @Get('test')
  test2(): string {
    return 'This is v2 endpoint.';
  }
}
```

### 接口限流保护

默认一个IP一个端点每分钟仅允许调用60次,特例场景可以通过装饰器跳过限流或局部修改限流,示例如下:

```typescript
@Controller('example')
export class ExampleController {
  // 该接口跳过节流保护
  @SkipThrottle()
  @Get('test')
  test(): string {
    return 'Hello world.';
  }

  // 该接口每分钟调用不超过3次
  @Throttle(3, 60)
  @Get('test2')
  test(): string {
    return 'Hello world.';
  }

  // 默认采用全局节流配置
  @Get('test3')
  test(): string {
    return 'Hello world.';
  }
}
```

要修改默认配置前往`src/app.module.ts`文件,通过.env配置文件可修改以下配置

```dotenv
APP_THROTTLE_TTL=60000
APP_THROTTLE_LIMIT=60
```

### 约束接口进参,移除非白名单属性,自动转换数据为符合预期的类型

当遇见多个Dto联合类型时,内置ValidationPipe失效,可按照下列示例处理:

```typescript
import { IsNumber, IsString, IsOptional } from 'class-validator';
import { Body } from '@nestjs/common';
import { validateMultipleDto } from '@app/common';

class ADto {
  @IsString()
  id: string;
}

class BDto {
  @IsNumber()
  age: number;
}

class CDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;
}

@Controller('example')
export class ExampleController {
  @Get('test')
  test(@Body() body: ADto | BDto): string {
    // 验证失败会抛出异常终止程序,第三个参数AND,OR来控制处理逻辑,默认是OR逻辑
    validateMultipleDto(body, [ADto, BDto]);
    return 'Hello world.';
  }

  /**
   * @description 假如入参是 { name: 'test', test: 'test' }
   * 实际body会是 { name: 'test' }, test属性会被自动移除
   */
  @Get('test2')
  test2(@Body() body: CDto) {
    return 'Hello world.';
  }
}
```

### 支持Swagger API文档

`npm run start:dev` 或其他start启动项目后,访问/api/docs路径

### 基于Docker快速构建分发

`pnpm build` 构建产物

`docker build . -t <image_name>` 构建镜像

`docker run -d -p <port>:3000 --name <container_name> -v <node_modules_dir>:/root/compass-service/node_modules -v <env_file>:/root/compass-service/.env <image_name>` (-p,--name, -v均为可选参数,) 运行镜像,.env配置文件格式参考 .env.example

### 默认提供Github Actions文件进行自动lint和部署

详情参考: `.github/workflows/deploy.yml`

在部署时需要变量和密钥如下所示:

- `vars.DOCKERHUB_USERNAME` Dockerhub 用户名
- `vars.DOCKERHUB_IMAGE_NAME` Dockerhub 镜像名
- `secrets.DOCKERHUB_TOKEN` Dockerhub api token

**供快速部署和参考使用** 如果该CI和部署地址非自己所要的可直接删除.github文件夹即可

### 统一的响应拦截器,规范返回数据

在`libs/common/src/interceptors/response.interceptor.ts`定义的默认拦截逻辑,示例如下:

```typescript
import { BusinessStatus, HttpResponse } from '@app/common';

@Controller('example')
export class ExampleController {
  @Get('test')
  test() {
    return 'Hello world.'; // 实际响应: new HttpResponse({ data: 'Hello world.' })
  }

  @Get('test2')
  test2() {
    return new HttpResponse('Hello world.', { responseType: 'raw' }); // 实际响应: 'Hello world.'
  }

  @Get('test3')
  test3() {
    // 尽管是throw,但是客户端收到的返回依旧以HttpResponse配置为准,可以用来快捷中断程序逻辑执行,又控制响应的状态与数据
    throw new HttpResponse({
      data: 'Hello world.',
      statusCode: BusinessStatus.BAD_REQUEST,
      httpStatus: HttpStatus.FORBIDDEN,
    });
  }

  @Get('test4')
  test4() {
    // 实际响应 new HttpResponse({ httpStatus: HttpStatus.INTERNAL_SERVER_ERROR, statusCode: BusinessStatus.INTERNAL_SERVER_ERROR, message: 'Server internal error' })
    throw new Error('Unknown error');
  }
}
```

### JWT Token处理

#### 微服务模式

放开 `src/main.ts` 内 `app.useGlobalGuards(new JWTAuthGuard(reflector));` 相关内容的注释

调整 `libs/common/src/guards/jwt-auth.guard.ts` 注释内容,切换为rpc模式

声明开放类或接口:

```typescript
import { MSPayload, Public } from '@app/common';

@Public() // 这里声明整个类都是开放的
@Controller()
export class OauthController {
  @MessagePattern({
    method: 'POST',
    url: '/oauth/test',
  })
  async test(@MSPayload('body') payload: PayloadDto) {
    return payload;
  }

  @Public() // 这里仅声明接口是开放的
  @MessagePattern({
    method: 'POST',
    url: '/oauth/test2',
  })
  async test2(@MSPayload('body') payload: PayloadDto) {
    return payload;
  }
}
```

其中 MSPayload 装饰器帮助快捷获取微服务参数

声明保护类或接口:

```typescript
import { Auth, PERMISSIONS } from '@app/common';

@Auth() // 这里声明整个类都是需要授权信息的,但不指明具体权限,用户权限不为空即可
@Controller()
export class TestController {
  @Auth(PERMISSIONS.TEST) // 这里声明需要TEST权限
  @Get('test')
  async test(@Payload() payload: PayloadDto) {
    return payload;
  }

  @Auth([PERMISSIONS.TEST, PERMISSIONS.TEST2]) // 这里声明需要TEST以及TEST2双权限
  @Get('test2')
  async test2(@Payload() payload: PayloadDto) {
    return payload;
  }

  @Auth([PERMISSIONS.TEST, PERMISSIONS.TEST2], 'OR') // 这里声明需要TEST或TEST2之一的权限
  @Get('test3')
  async test3(@Payload() payload: PayloadDto) {
    return payload;
  }
}
```

#### 独立服务模式

基本等同于微服务的使用方式,放开 `src/main.ts` 内 `app.useGlobalGuards(new JWTAuthGuard(reflector));` 相关内容的注释

区别只是调整 `libs/common/src/guards/jwt-auth.guard.ts` 注释内容,使用http模式并调整user的获取方式即可

Controller内取参与官方文档一致即可

### 支持连接到Redis

基础 [redis](https://github.com/redis/node-redis) 实现,放开 `src/app.module.ts` redis注册并提供配置即可.

### 支持使用 Email

基于 [nodemailer](https://nodemailer.com/) 实现, 放开 `src/app.module.ts` email注册并提供配置即可.

### 支持Google reCAPTCHA v3 人机校验

客户端参考:

```html
<!-- 插入recaptcha脚本并指定key,如果是国内host需要替换为www.recaptcha.net -->
<script src="https://www.google.com/recaptcha/api.js?render=reCAPTCHA_site_key"></script>

<script>
  // 当点击某个提交按钮时进行人机静默校验,验证失败应该进行双重认证或拒绝访问
  function onClick(e) {
    e.preventDefault();
    // 提示: reCAPTCHA_site_key为您在Google ReCaptcha注册的网站key
    grecaptcha.ready(function () {
      // action各种含义参考: https://developers.google.com/recaptcha/docs/v3?hl=zh-cn#interpreting_the_score
      grecaptcha.execute('reCAPTCHA_site_key', { action: 'login' }).then(function (token) {
        // 在此处添加您的逻辑,把表单数据跟token一起提供给后端校验,接口地址请根据实际路由调整
        fetch('/api/v1/recaptcha/validate', {
          method: 'POST',
          body: JSON.stringify({ token }),
        })
          .then((resp) => resp.json())
          .then((result) => {
            if (result.statusCode === 100200 && result.data) {
              console.log('签发的临时许可 token: %s, 请在五分钟内使用此token登录', result.data);
            }
          });
      });
    });
  }
</script>
```

服务端流程:

- 在所需使用的路由Module中导入 GoogleRecaptchaModule 并提供密钥注册到路由中
- 在 Service 中,导入 GoogleRecaptchaService 并使用其校验方法 verifyRecaptcha 来验证收到的token信息
- 验证通过后下发一个五分钟有效的临时token
- 用户在登录时可将用户信息与临时token一并提交登录接口
- 登录接口验证token属于签发的授权token并账号密码正确即登录成功

### 支持Mysql

基于 [Mysql2](https://sidorares.github.io/node-mysql2/docs) 实现, 放开 `src/app.module.ts` mysql注册并提供配置即可.
