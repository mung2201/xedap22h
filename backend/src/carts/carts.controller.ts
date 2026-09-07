import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartResponse, CartsService } from './carts.service';

@ApiTags('Cart')
@ApiBearerAuth('access-token')
@Controller({ path: 'cart', version: '1' })
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get()
  @ApiOperation({ summary: 'Get the authenticated user cart with server-calculated prices' })
  @ResponseMessage('Get cart successfully.')
  findMine(@CurrentUser() user: AuthenticatedUser): Promise<CartResponse> {
    return this.cartsService.findMine(user.userId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a product variant to the cart after server stock validation' })
  @ResponseMessage('Cart item added successfully.')
  addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddCartItemDto,
  ): Promise<CartResponse> {
    return this.cartsService.addItem(user.userId, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity after server stock validation' })
  @ApiParam({ name: 'itemId', description: 'Cart item MongoDB ObjectId' })
  @ResponseMessage('Cart item updated successfully.')
  updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId', ParseMongoIdPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartResponse> {
    return this.cartsService.updateItem(user.userId, itemId, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove an item from the authenticated user cart' })
  @ApiParam({ name: 'itemId', description: 'Cart item MongoDB ObjectId' })
  @ResponseMessage('Cart item removed successfully.')
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId', ParseMongoIdPipe) itemId: string,
  ): Promise<CartResponse> {
    return this.cartsService.removeItem(user.userId, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear the authenticated user cart' })
  @ResponseMessage('Cart cleared successfully.')
  clearMine(@CurrentUser() user: AuthenticatedUser): Promise<CartResponse> {
    return this.cartsService.clearMine(user.userId);
  }
}
