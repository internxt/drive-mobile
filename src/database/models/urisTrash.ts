import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class UrisTrash {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    fileId: string;

    @Column({ nullable: false })
    uri: string;

    @Column({ nullable: false })
    userId: string;
}