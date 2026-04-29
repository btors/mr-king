import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Role } from '@prisma/client';

@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Public()
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() data: any) {
    return this.categoriesService.create(data);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() data: any) {
    return this.categoriesService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
