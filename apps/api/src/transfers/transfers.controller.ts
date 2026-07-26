import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Inject,
  Req,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { TransfersService } from "./transfers.service.js";
import {
  TransferPreviewDtoSchema,
  TransferConfirmDtoSchema,
} from "@botolahub/contracts";
import { FastifyRequest } from "fastify";

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    sub: string;
    sessionId: string;
    role: string;
  };
}

@Controller("transfers")
@UseGuards(JwtAuthGuard)
export class TransfersController {
  constructor(
    @Inject(TransfersService)
    private readonly transfersService: TransfersService,
  ) {}

  @Post("preview")
  async preview(
    @Req() req: AuthenticatedRequest,
    @Body() body: Record<string, unknown>,
  ) {
    const dto = TransferPreviewDtoSchema.parse(body);
    const data = await this.transfersService.preview(req.user.sub, dto);
    return { data };
  }

  @Post("confirm")
  async confirm(
    @Req() req: AuthenticatedRequest,
    @Body() body: Record<string, unknown>,
  ) {
    const dto = TransferConfirmDtoSchema.parse(body);
    const data = await this.transfersService.confirm(req.user.sub, dto);
    return { data };
  }

  @Get("history")
  async history(@Req() req: AuthenticatedRequest) {
    const data = await this.transfersService.getHistory(req.user.sub);
    return { data };
  }
}
