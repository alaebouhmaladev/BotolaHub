import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CatalogService } from './catalog.service.js';

@ApiTags('Catalog')
@Controller('api/v1/catalog')
export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  @Get('clubs')
  @ApiOperation({ summary: 'Get all Botola Pro clubs' })
  async getClubs() {
    return this.catalogService.getClubs();
  }

  @Get('competitions')
  @ApiOperation({ summary: 'Get all competitions' })
  async getCompetitions() {
    return this.catalogService.getCompetitions();
  }

  @Get('seasons')
  @ApiOperation({ summary: 'Get all seasons' })
  async getSeasons() {
    return this.catalogService.getSeasons();
  }
}
