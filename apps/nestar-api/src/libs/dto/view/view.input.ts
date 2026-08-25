import { Field, Int, ObjectType } from '@nestjs/graphql';
import type { ObjectId } from 'mongoose';
import { IsNotEmpty } from 'class-validator';
import { ViewGroup } from '../../enums/view.enum';

@ObjectType()
export class ViewInput {
	@IsNotEmpty()
	@Field(() => String)
	memberId!: ObjectId;

	@IsNotEmpty()
	@Field(() => String)
	viewRefId!: ObjectId;

	@IsNotEmpty()
	@Field(() => ViewGroup)
	viewGroup!: ViewGroup;
}
