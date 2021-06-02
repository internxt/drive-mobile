import React from 'react'
import { Text, View } from 'react-native'
import { tailwind, getColor } from '../../tailwind'
import Syncing from '../../../assets/icons/photos/syncing.svg'
import Back from '../../../assets/icons/photos/back.svg'
import { TextInput, TouchableOpacity } from 'react-native-gesture-handler'
import FilterButton from './FilterButton'
import { layoutActions } from '../../redux/actions'
import Lens from '../../../assets/icons/photos/lens.svg';
import CrossWhite from '../../../assets/icons/photos/cross-white.svg'

interface HeaderProps {
  dispatch: any
  title: string
  isSyncing: boolean
  isAlbumSelected: boolean
  setIsAlbumSelected: React.Dispatch<React.SetStateAction<boolean>>
  selectedFilter: string
  handleOnPressFilter: () => void
  handleFilterSelection: (filterName: string) => void
  searchString: string
  setSearchString: React.Dispatch<React.SetStateAction<string>>
  setAlbumTitle: React.Dispatch<React.SetStateAction<string>>
}

const Header = ({
  dispatch,
  title,
  isSyncing,
  isAlbumSelected,
  setIsAlbumSelected,
  selectedFilter,
  handleOnPressFilter,
  handleFilterSelection,
  searchString,
  setSearchString,
  setAlbumTitle
}: HeaderProps): JSX.Element => {
  return (
    <View style={tailwind('flex-col items-center')}>
      <View style={tailwind('flex-row items-center mt-4')}>
        {isAlbumSelected ?
          <View style={tailwind('w-1/5 items-start justify-center')}>
            <TouchableOpacity style={tailwind('w-12 pl-2 border')}
              onPress={() => setIsAlbumSelected(false)}
            >
              <Back width={25} height={25} />
            </TouchableOpacity>
          </View>
          :
          <View style={tailwind('w-1/5')}></View>
        }

        <Text style={tailwind('w-3/5 text-center text-xl text-gray-80 font-averta-regular')}>
          {title}
        </Text>

        <View style={tailwind('w-1/5 justify-center items-end')}>
          <View style={tailwind('items-center justify-center mr-2 mb-1')}>
            <Syncing width={25} height={25} />
          </View>
        </View>
      </View>

      <View>
        {title === 'INTERNXT PHOTOS' ?
          <View style={tailwind('flex-row mt-3 items-center justify-center')}>
            <FilterButton width='w-1/3' corners='rounded-l' text='Download' filter='download' handleFilterSelection={handleFilterSelection} activeFilter={selectedFilter} />
            <FilterButton width='w-4/10' corners='' text='Upload pending' filter='upload' handleFilterSelection={handleFilterSelection} activeFilter={selectedFilter} />
            <FilterButton width='w-3/10'
              corners='rounded-r'
              text='Albums'
              filter='albums'
              activeFilter={selectedFilter}
              onPress={handleOnPressFilter}
            />
          </View>
          :
          !isAlbumSelected ?
            <View style={tailwind('flex-row mt-3 items-center justify-center')}>
              <View style={tailwind('w-1/10 h-8 items-center justify-center bg-white rounded-l-md')}>
                <Lens width={19} height={19} />
              </View>

              <View style={tailwind('w-7/12 h-8 ml-px mr-1')}>
                <TextInput
                  style={tailwind('w-full h-full bg-white text-sm font-averta-regular pl-2 pb-1')}
                  placeholderTextColor={getColor('gray-30')}
                  placeholder='Search a memory'
                  onChangeText={value => setSearchString(value)}
                  value={searchString}
                  autoCapitalize='none'
                  autoCorrect={false}
                />
              </View>

              <View style={tailwind('w-1/3')}>
                <TouchableOpacity style={tailwind('flex-row h-8 px-2 bg-blue-60 rounded-r-md items-center justify-around')}
                  onPress={() => {
                    setAlbumTitle('')
                    dispatch(layoutActions.openCreateAlbumModal())}
                  }
                >
                  <CrossWhite width={10} height={10} />
                  <Text style={tailwind('text-white font-averta-regular text-sm')}>Add album</Text>
                </TouchableOpacity>
              </View>
            </View>
            :
            null
        }
      </View>
    </View>
  )
}

export default React.memo(Header);