import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(
          JSON.parse(this.configService.get("FIREBASE_SERVICE_ACCOUNT") ?? "{}"),
        ),
      });
    }
  }

  async verifyFirebaseToken(idToken: string) {
    const decoded = await admin.auth().verifyIdToken(idToken);
    let user = await this.usersService.findByFirebaseUid(decoded.uid).catch(() => null);

    if (!user) {
      user = await this.usersService.create({
        firebaseUid: decoded.uid,
        email: decoded.email ?? "",
        name: decoded.name ?? "Customer",
      });
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return { accessToken: this.jwtService.sign(payload), user };
  }
}
