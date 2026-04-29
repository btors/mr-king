import { Module } from '@nestjs/common';
import { PizzasService } from './pizzas.service';
import { PizzasController } from './pizzas.controller';

@Module({
  controllers: [PizzasController],
  providers: [PizzasService],
  exports: [PizzasService],
})
export class PizzasModule {}
