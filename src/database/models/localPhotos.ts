import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class LocalPhotos {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: false })
    hash: string;

}