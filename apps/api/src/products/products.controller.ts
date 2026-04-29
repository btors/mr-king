import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Role } from '@prisma/client';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Public()
  async findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() data: any) {
    return this.productsService.create(data);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() data: any) {
    return this.productsService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
