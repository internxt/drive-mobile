import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Photos {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    fileId: string;

    @Column()
    name: string;

    @Column()
    type: string;

    @Column()
    hash: string;

    @Column('int', { nullable: false })
    photoId: number;

    @Column({ nullable: false })
    userId: string;
}