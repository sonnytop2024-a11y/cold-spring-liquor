import { Controller, Post, Body } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("firebase")
  async firebaseLogin(@Body() body: { idToken: string }) {
    return this.authService.verifyFirebaseToken(body.idToken);
  }
}
