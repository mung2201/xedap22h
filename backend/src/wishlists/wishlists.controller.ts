import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { MoveWishlistToCartDto } from './dto/move-wishlist-to-cart.dto';
import {
  WishlistMoveToCartResponse,
  WishlistResponse,
  WishlistsService,
} from './wishlists.service';

@ApiTags('Wishlist')
@ApiBearerAuth('access-token')
@Controller({ path: 'wishlist', version: '1' })
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Get()
  @ApiOperation({ summary: 'Get the authenticated user wishlist' })
  @ResponseMessage('Get wishlist successfully.')
  findMine(@CurrentUser() user: AuthenticatedUser): Promise<WishlistResponse> {
    return this.wishlistsService.findMine(user.userId);
  }

  @Get(':productId/status')
  @ApiOperation({ summary: 'Check whether a product is in the authenticated user wishlist' })
  @ApiParam({ name: 'productId', description: 'Product MongoDB ObjectId' })
  @ResponseMessage('Get wishlist status successfully.')
  isWishlisted(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseMongoIdPipe) productId: string,
  ): Promise<{ isWishlisted: boolean }> {
    return this.wishlistsService.isWishlisted(user.userId, productId);
  }

  @Post(':productId')
  @ApiOperation({ summary: 'Add an active product to the authenticated user wishlist' })
  @ApiParam({ name: 'productId', description: 'Product MongoDB ObjectId' })
  @ResponseMessage('Product added to wishlist successfully.')
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseMongoIdPipe) productId: string,
  ): Promise<WishlistResponse> {
    return this.wishlistsService.add(user.userId, productId);
  }

  @Post(':productId/move-to-cart')
  @ApiOperation({ summary: 'Move a wishlisted product variant into the cart' })
  @ApiParam({ name: 'productId', description: 'Product MongoDB ObjectId' })
  @ResponseMessage('Wishlist item moved to cart successfully.')
  moveToCart(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseMongoIdPipe) productId: string,
    @Body() dto: MoveWishlistToCartDto,
  ): Promise<WishlistMoveToCartResponse> {
    return this.wishlistsService.moveToCart(user.userId, productId, dto);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove a product from the authenticated user wishlist' })
  @ApiParam({ name: 'productId', description: 'Product MongoDB ObjectId' })
  @ResponseMessage('Product removed from wishlist successfully.')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseMongoIdPipe) productId: string,
  ): Promise<WishlistResponse> {
    return this.wishlistsService.remove(user.userId, productId);
  }
}
