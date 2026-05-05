import { IsNumber, Min, IsNotEmpty } from 'class-validator';

export class OpenShiftDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0, { message: 'El fondo de apertura no puede ser negativo.' })
  openingBalance: number;
}

export class CloseShiftDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0, { message: 'El balance actual no puede ser negativo.' })
  actualBalance: number;
}
