import { Injectable } from "@nestjs/common";

@Injectable()
export class OrpcService {
  healthCheck() {
    return "OK" as const;
  }

  getPrivateData(user: unknown) {
    return {
      message: "This is private",
      user,
    };
  }
}
