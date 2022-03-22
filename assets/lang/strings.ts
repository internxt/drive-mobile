/* eslint-disable quotes */
/* eslint-disable max-len */
import LocalizedStrings from 'react-native-localization';
import { ReferralTypes } from '@internxt/sdk/dist/drive/referrals';
import { SortType, ToastType } from '../../src/types';

const strings = new LocalizedStrings({
  en_US: {
    generic: {
      loading: 'Loading',
      security: 'Security',
      create: 'Create',
      creating: 'Creating...',
      preparing: 'Preparing...',
      rename: 'Rename',
      close: 'Close',
      upload: 'Upload',
      delete: 'Delete',
      settings: 'Settings',
      updated: 'Updated',
      monthly: 'Monthly',
      annually: 'Annually',
    },
    tabs: {
      home: 'Home',
      drive: 'Drive',
      create: 'Create',
      photos: 'Photos',
      menu: 'Settings',
    },
    screens: {
      DebugScreen: {
        title: 'Debug',
        notifications: {
          title: 'Notifications',
          advice: 'Test all notification types.',
          type: {
            [ToastType.Info]: 'Info',
            [ToastType.Success]: 'Success',
            [ToastType.Warning]: 'Warning',
            [ToastType.Error]: 'Error',
            [ToastType.Upload]: 'Upload',
            [ToastType.Download]: 'Download',
          },
          test: {
            text1: 'This is a test notification',
          },
        },
      },
      home: {
        title: 'Home',
      },
      change_password: {
        confirm: 'Delete account',
        title: 'Change password',
        warning:
          'Remember that if you change your password, you will be signed out in all your devices. You will need these credentials for logining in again.',
        iDontRememberMyPassword: "I don't remember my password",
      },
      recover_password: {
        title: 'Recover password',
        warning: 'You can use this device to set a new password and recover your account',
      },
      login_screen: {
        title: 'Login in to Internxt',
        forgot: 'Forgot your password?',
        no_register: "Don't have account?",
        register: 'Get started',
        back: 'Back to login',
      },
      SignUpScreen: {
        first:
          '{0} is a {1} cloud storage service. A {2} place for all your files. Welcome to the {3}. Welcome to {4}.',
        second:
          'Files are {0} on your device. There is {1} we nor any other third-party can access them. {2}, as it should have always been.',
        third:
          'Access Internxt from {7}, {8} or {9}. Start using Internxt today with {10} on us. {11} when needed, free for a month, cancel anytime.',
        bold_first: ['Internxt', 'different', 'better', 'revolution', 'Internxt'],
        bold_second: ['encrypted', 'no way', 'Privacy'],
        bold_third: ['Desktop', 'Web', 'Mobile', '10 GB', 'Upgrade your storage'],
        security_title: 'Internxt Security',
        security_subtitle:
          "Internxt uses your password to encrypt and decrypt your files. Due to the secure nature of Internxt, we don't know your password. That means that if you ever forget it, your files are gone forever. With us, you're the only owner of your files.",
        suggestion_1: 'Store your password. Keep it safe and secure.',
        suggestion_2: 'Keep an offline backup of your password.',
        create_account_title: 'Create an Internxt account',
        acceptTermsAndConditions: 'Accept terms, conditions and privacy policy',
      },
      forgot_password: {
        title: 'Internxt security',
        subtitle_1:
          "As specified during the sign up process, Internxt Drive encrypts your files, and only you have access to those. We never know your password, and thus, that way, only you can decrypt your account. For that reason, if you forget your password, we can't restore your account. What we can do, however, is to",
        bold: ' delete your account and erase all its files',
        subtitle_2:
          ', so that you can sign up again. Please, if you still want to procede, enter your email below so that we can process the account removal.',
      },
      deactivation_screen: {
        title: 'Deactivation email',
        subtitle_1:
          'Please check your email and follow the instructions to deactivate your account so you can start using Internxt again.',
        subtitle_2:
          'Once you deactivate your account, you will be able to sign up using the same email address. Please store your password somewhere safe. With Internxt Drive, only you are the true owner of your files on the cloud. With great power there must also come great responsibility.',
      },
      drive: {
        title: 'Drive',
        aToZ: 'A to Z',
        zToA: 'Z to A',
        ascending: 'Ascending',
        descending: 'Descending',
        newerFirst: 'Newer First',
        olderFirst: 'Older first',
        sortBy: 'Sort by',
        sort: {
          name: 'Name',
          updatedAt: 'Updated at',
          size: 'Size',
        },
        emptyRoot: {
          title: 'Your drive is empty',
          message: 'Try uploading a file or creating a folder',
        },
        emptyFolder: {
          title: 'This folder is empty',
          message: 'Try uploading a file or creating a folder',
        },
        searchInThisFolder: 'Search in this folder',
      },
      recents: {
        title: 'Recents',
        empty: {
          title: 'No recents files',
          message: 'Try interacting with your files',
        },
      },
      shared: {
        title: 'Shared',
        empty: {
          title: 'No shared items',
          message: 'Your shared items will show up here',
        },
      },
      storage: {
        title: 'Storage',
        currentPlan: 'Current plan',
        usage: 'Usage',
        space: {
          title: 'Storage space',
          used: {
            used: 'Used',
            of: 'of',
          },
          legend: {
            used: 'Used space',
            unused: 'Unused space',
          },
        },
        plans: {
          title: 'Storage plans',
          title_2: 'Payment length',
          current_plan: 'You are subscribed to the',
          pay: 'Pay per',
          pre_pay: 'Prepay',
          month: 'month',
          months: 'months',
        },
        referrals: {
          title: 'Unlock storage for free',
          items: {
            [ReferralTypes.ReferralKey.CreateAccount]: 'Create an account',
            [ReferralTypes.ReferralKey.InstallMobileApp]: 'Upload a file',
            [ReferralTypes.ReferralKey.ShareFile]: 'Share a file via link',
            [ReferralTypes.ReferralKey.SubscribeToNewsletter]: 'Subscribe to newsletter',
            [ReferralTypes.ReferralKey.InstallDesktopApp]: 'Upload a file using the desktop app',
            [ReferralTypes.ReferralKey.InviteFriends]: 'Invite {0}/{1} friends',
          },
        },
      },
      create_folder: {
        input: 'Enter folder name',
        title: 'New folder',
        defaultName: 'New folder',
        confirm: 'Create',
      },
      billing: {
        title: 'Plans',
        billedEachPeriod: '€{0} billed {1}',
        features: {
          guarantee: '30 days guarantee',
          share: 'Private and secure file sharing',
          anyDevice: 'Access your files from any device',
        },
      },
      photosPermissions: {
        title: 'Sync all your photos with all your devices',
        features: {
          0: 'Keep your photos safe and private in your cloud, only you can access them.',
          1: 'Access all your photos from all of your devices, even from the web browser.',
          2: 'Backup your photos.',
        },
        iosAdvice: 'On the following screen, change Photos access from None to All Photos.',
        androidAdvice:
          'Go to Settings > Apps > Internxt Drive. Select app permissions and allow access to ’Storage’ and ‘Camera’.',
        access: 'The Photos app needs access to your photos to let you view, sync and share photos from this device.',
      },
      gallery: {
        title: 'Gallery',
        nPhotosSelected: '{0} selected',
        empty: 'No photos to show',
        loading: 'Loading photos...',
        syncing: 'Syncing {0} of {1}',
        groupBy: {
          years: 'Years',
          months: 'Months',
          days: 'Days',
          all: 'All',
        },
      },
    },
    components: {
      buttons: {
        sign_in: 'Sign in',
        create: 'Create an account',
        next: 'Next',
        get_started: 'Get started',
        continue: 'Continue',
        back: 'Back',
        creating_button: 'Creating...',
        deactivation: 'Re-send deactivation email',
        sing_up: 'Sign up',
        descrypting: 'Decrypting...',
        cancel: 'Cancel',
        confirm: 'Confirm',
        move: 'Move',
        share: 'Share',
        upgrade: 'Upgrade',
        upgradeNow: 'Upgrade now',
        uploadFiles: 'Upload files',
        uploadFromCameraRoll: 'Upload from camera roll',
        takeAPhotoAnUpload: 'Take a photo and upload',
        newFolder: 'New folder',
        changePlan: 'Change plan',
        select: 'Select',
        selectAll: 'Select all',
        info: 'Info',
        shareWithLink: 'Share with link',
        download: 'Download',
        moveToThrash: 'Move to trash',
        copyLink: 'Copy link',
        startSyncingPhotos: 'Start syncing my photos',
        syncNow: 'Sync now',
        tryAgain: 'Try again',
        subscribe: 'Subscribe',
        invite: 'Invite',
        grant: 'Grant',
        dismiss: 'Dismiss',
      },
      inputs: {
        email: 'Email address',
        newPassword: 'New password',
        password: 'Password',
        confirm_password: 'Confirm password',
        first_name: 'First name',
        last_name: 'Last name',
        searchInRecents: 'Search in recents',
        searchInShared: 'Search in shared',
      },
      FileList: {
        noResults: {
          title: 'No results found',
          message: 'Any item in this folder match this search',
        },
      },
      empty_folder: {
        title: 'This looks empty!',
        subtitle: 'Click the upload button to get started.',
      },
      app_menu: {
        search_box: 'Search',
        filter: {
          date: 'Upload Date',
          size: 'Size',
          name: 'Name',
          type: 'File type',
        },
        settings: {
          storage: 'Storage',
          more: 'More info',
          drive: 'Drive',
          contact: 'Support',
          signOut: 'Log out',
        },
      },
      file_and_folder_options: {
        styling: 'Style color',
        icons: 'Cover icon',
        type: 'Type: ',
        added: 'Added: ',
        size: 'Size: ',
        move: 'Move',
        share: 'Share with link',
        delete: 'Delete',
        view: 'View',
      },
      ReferralsBanner: {
        message: 'Get up to 10GB for free',
      },
    },
    modals: {
      UploadModal: {},
      MoveModal: {
        title: 'Choose a folder to move this file.',
      },
      ShareModal: {
        title: 'Internxt Drive file sharing',
        message: '{0}',
        share: 'Share',
        copy: 'Copy',
        loading: 'Loading link...',
      },
      delete_modal: {
        title: 'Delete permanently?',
        subtitle: 'Please confirm you want to delete this item. This action can not be undone.',
        warning: 'This action cannot be undone',
        delete: 'Delete',
      },
      out_of_space_modal: {
        title: 'Ran out of storage',
        subtitle:
          'You have currently used 3GB of storage. To start uploading more files, please upgrade your storage plan.',
      },
      coming_soon_modal: {
        title: 'Coming soon!',
        subtitle: 'Our fantastic devs are working on it, so stay tuned!',
        got_it: 'Got it!',
      },
      deletePhotosModal: {
        title: 'Move photo/s to trash',
        message: 'Photos won’t be deleted from your phone, they will remain in the trash until you empty the trash.',
      },
      photos_preview_info_modal: {
        options: {
          name: 'Name',
          uploaded: 'Uploaded',
          modified: 'Modified',
          size: 'Size',
          dimensions: 'Dimensions',
          format: 'Format',
        },
      },
      share_photo_modal: {
        nativeMesage: 'Take a look to this photo!',
        linkOpenLimit: 'Link open limit',
        decrypting: 'Decrypting image {0}%',
        photoReady: 'Your photo is ready!',
        shareWithYourContacts: 'Share the photo with your contacts',
      },
      link_copied_modal: {
        message: 'Link copied to clipboard',
      },
      run_out_of_storage: {
        advice: 'Get a higher plan or remove files you will no longer use in order to upload or sync your files again.',
      },
      InviteFriendsModal: {
        title: 'Invite a friend',
        message:
          'Get up to 4GB extra free storage by inviting your friends (1GB per user registered via your invitation)',
      },
      NewsletterModal: {
        title: 'Subscribe to our newsletter',
        message: 'Get the last news and updated right in your mail box',
      },
    },
    messages: {
      folderCreated: 'Folder created',
      itemsDeleted: 'Item/s deleted',
      photoShared: 'You have shared a photo!',
      photosSyncPending: 'Pending synchronization',
      photosSyncCompleted: 'Your device is up to date',
      renamedSuccessfully: 'Renamed successfully',
      linkCopied: 'Link copied',
      passwordChanged: 'Password changed',
    },
    errors: {
      generic: {
        title: 'There has been an error',
        message: '{0}. Please contact us.',
      },
      unknown: 'Unknown error',
      uploadFile: 'File upload error: {0}',
      storageLimitReached: 'You have reached your storage limit',
      photosInitialize: 'Error initializing Photos: {0}',
      photoShared: 'An error has ocurred during photo sharing',
      photosSync: 'Error during photos sync: {0}',
      photosLoad: 'Error loading photos: {0}',
      photosDelete: 'Error deleting photo/s: {0}',
      photosFullSizeLoad: 'Error loading full size photo: {0}',
      fetchReferrals: 'Error fetching referrals: {0}',
      inviteAFriend: 'Error sending invitation: {0}',
      subscribeToNewsletter: 'Error subscribing to newsletter: {0}',
      loadProducts: 'Cannot load products: {0}',
    },
  },
  es: {
    generic: {
      loading: 'Cargando',
      security: 'Seguridad',
      create: 'Crear',
      creating: 'Creando...',
      preparing: 'Preparando...',
      rename: 'Renombrar',
      close: 'Cerrar',
      upload: 'Subir',
      delete: 'Eliminar',
      settings: 'Ajustes',
      updated: 'Actualizado',
      monthly: 'Mensual',
      annually: 'Anual',
    },
    tabs: {
      home: 'Inicio',
      drive: 'Drive',
      create: 'Crear',
      photos: 'Photos',
      menu: 'Ajustes',
    },
    screens: {
      DebugScreen: {
        title: 'Depuración',
        notifications: {
          title: 'Notificaciones',
          advice: 'Prueba todos los tipos de notificaciones.',
          type: {
            [ToastType.Info]: 'Info',
            [ToastType.Success]: 'Éxito',
            [ToastType.Warning]: 'Advertencia',
            [ToastType.Error]: 'Error',
            [ToastType.Upload]: 'Subida',
            [ToastType.Download]: 'Descarga',
          },
          test: {
            text1: 'Esta es una notificación de prueba',
          },
        },
      },
      home: {
        title: 'Inicio',
      },
      change_password: {
        title: 'Cambiar contraseña',
        confirm: 'Borrar cuenta',
        warning:
          'Recuerda que si cambias tu contraseña, se cerrará sesión en todos tus dispositivos. Necesitarás la nueva contraseña para acceder otra vez.',
        iDontRememberMyPassword: 'No recuerdo mi contraseña',
      },
      recover_password: {
        title: 'Recuperar contraseña',
        warning: 'Usa este dispositivo para cambiar tu contraseña y recuperar tu cuenta.',
      },
      login_screen: {
        title: 'Inicia sesión en Internxt',
        forgot: '¿Has olvidado la contraseña?',
        no_register: '¿No tienes cuenta?',
        register: 'Regístrate',
        back: 'Iniciar sesión',
      },
      SignUpScreen: {
        first:
          '{0} es un servicio de almacenamiento en la nube {1}. Un lugar {2} para todos tus archivos. Bienvenido a la {3}. Bienvenido a {4}.',
        second:
          'Los archivos son {4} en tu dispositivo. {5} de terceros podemos acceder a ellos. {6}, como siempre tuvo que ser.',
        third:
          'Accede a Internxt desde {7}, {8} o {9}. Empieza a usar Internxt hoy con {10} gratis. {11} cuando lo necesites, gratis por un mes, cancela cuando quieras.',
        bold_first: ['Internxt', 'diferente', 'mejor', 'revolución', 'Internxt'],
        bold_second: ['encriptados', 'Ni nosotros ni ningún servicio', 'Privacidad'],
        bold_third: ['escritorio', 'web', 'móvil', '10 GB', 'Mejora tu almacenamiento'],
        security_title: 'Internxt Security',
        security_subtitle:
          'Interxt usa tu contraseña para encriptar y decriptar tus archivos. Debido a la segura naturaleza de nuestro servicio, nosotros no sabemos tu contraseña. Esto significa que si algún día la llegas a perder, tus archivos se volverán inaccesibles. Con nosotros, tú eres el único propietario de tus archivos.',
        suggestion_1: 'Guardes tu contraseña. Mantenla sana y salva.',
        suggestion_2: 'Guarda una copia local de todos tus archivos.',
        create_account_title: 'Crear cuenta',
        acceptTermsAndConditions: 'Aceptar términos, condiciones y política de privacidad',
      },
      forgot_password: {
        title: 'Internxt security',
        subtitle_1:
          'Como se especificó durante el proceso de registro, Internxt Drive encripta tus archivos, y solo tú tienes acceso a ellos. Nosotros nunca llegamos a conocer tu contraseña, y debido a esto, solo tú puedes desencriptar tus archivos. Si te has olvidado de la contraseña, no podemos restablecerla. Lo que sí que podemos hacer, es',
        bold: ' borrar tu cuenta y todos tus archivos',
        subtitle_2:
          ', por lo que podrás volver a registrarte con el mismo correo electrónico. Por favor, introduce tu correo electrónico para que podamos procesar el borrado de tu cuenta.',
      },
      deactivation_screen: {
        title: 'Email de desactivación',
        subtitle_1:
          'Por favor, comprueba el email que te hemos enviado y sigue las intrucciones para desactivar tu cuenta para que puedas seguir usando Internxt Drive.',
        subtitle_2:
          'Una vez desactives tu cuenta, podrás volver a registrarte usando el mismo correo electrónico. Por favor guarda tu contraseña en un lugar seguro. Con Internxt Drive, solo tú eres el propietario de tus archivos. Un gran poder convella una gran responsabilidad.',
      },
      drive: {
        title: 'Drive',
        aToZ: 'Desde la A hasta la Z',
        zToA: 'Desde la Z hasta la A',
        ascending: 'Ascendiente',
        descending: 'Descendiente',
        newerFirst: 'Más nuevo primero',
        olderFirst: 'Más antiguo primero',
        sortBy: 'Ordenar por',
        sort: {
          [SortType.Name]: 'Nombre',
          [SortType.UpdatedAt]: 'Fecha de modificación',
          [SortType.Size]: 'Tamaño',
        },
        emptyRoot: {
          title: 'Tu drive está vacío',
          message: 'Prueba a subir un archivo o crear una carpeta',
        },
        emptyFolder: {
          title: 'Esta carpeta está vacía',
          message: 'Prueba a subir un archivo o crear una carpeta',
        },
        searchInThisFolder: 'Buscar en esta carpeta',
      },
      recents: {
        title: 'Recientes',
        empty: {
          title: 'No hay archivos recientes',
          message: 'Intenta interactuar con tus archivos',
        },
      },
      shared: {
        title: 'Compartido',
        empty: {
          title: 'No hay archivos compartidos',
          message: 'Tus archivos compartidos se mostrarán aquí',
        },
      },
      storage: {
        title: 'Almacenamiento',
        currentPlan: 'Plan actual',
        usage: 'Uso',
        space: {
          title: 'Espacio de almacenamiento',
          used: {
            used: 'Usado',
            of: 'de',
          },
          legend: {
            used: 'Espacio usado',
            unused: 'Espacio sin usar',
          },
        },
        plans: {
          title: 'Planes de almacenamiento',
          title_2: 'Duración del pago',
          current_plan: 'Actualmente estás suscrito al plan de',
          pay: 'Paga',
          pre_pay: 'Prepaga',
          month: 'al mes',
          months: 'meses',
        },
        referrals: {
          title: 'Desbloquea almacenamiento gratis',
          items: {
            [ReferralTypes.ReferralKey.CreateAccount]: 'Crear cuenta',
            [ReferralTypes.ReferralKey.InstallMobileApp]: 'Subir archivo',
            [ReferralTypes.ReferralKey.ShareFile]: 'Compartir link archivo',
            [ReferralTypes.ReferralKey.SubscribeToNewsletter]: 'Suscribirse a newletter',
            [ReferralTypes.ReferralKey.InstallDesktopApp]: 'Sube un archivo con la app de escritorio',
            [ReferralTypes.ReferralKey.InviteFriends]: 'Invitar {0}/{1} amigos',
          },
        },
      },
      create_folder: {
        input: 'Nombre de la carpeta',
        title: 'Crear carpeta',
        defaultName: 'Nueva carpeta',
        confirm: 'Crear',
      },
      billing: {
        title: 'Planes',
        billedEachPeriod: '{0}€ facturados {1}',
        features: {
          guarantee: '30 días de garantía',
          share: 'Comparte tus archivos de forma privada y segura',
          anyDevice: 'Accede a tus archivos desde cualquier dispositivo',
        },
      },
      photosPermissions: {
        title: 'Sincroniza tus fotos con todos tus dispositivos',
        features: {
          0: 'Mantenga sus fotos seguras y privadas en su nube, solo usted puede acceder a ellas.',
          1: 'Accede a todas tus fotos desde todos tus dispositivos, incluso desde el navegador web.',
          2: 'Haz una copia de seguridad de tus fotos.',
        },
        iosAdvice: 'En la siguiente pantalla, cambie el acceso a Fotos de Ninguno a Todas las fotos.',
        androidAdvice:
          'Ve a Configuración > Aplicaciones > Internxt Drive. En permisos de la aplicación permita el acceso a "Almacenamiento" y "Cámara".',
        access:
          'Se necesita acceder a tus fotos para que puedas ver, sincronizar y compartir fotos desde este dispositivo.',
      },
      gallery: {
        title: 'Galería',
        nPhotosSelected: '{0} seleccionadas',
        empty: 'No hay fotos para mostrar',
        loading: 'Cargando fotos...',
        syncing: 'Sincronizando {0} de {1}',
        groupBy: {
          years: 'Años',
          months: 'Meses',
          days: 'Días',
          all: 'Todo',
        },
      },
    },
    components: {
      buttons: {
        sign_in: 'Iniciar sesión',
        create: 'Crear cuenta',
        next: 'Siguiente',
        get_started: 'Empezar',
        continue: 'Continuar',
        back: 'Atrás',
        creating_button: 'Creando...',
        deactivation: 'Reenviar correo de desactivación',
        sing_up: 'Registarse',
        descrypting: 'Desencriptando...',
        cancel: 'Cancelar',
        confirm: 'Confirmar',
        move: 'Mover',
        share: 'Compartir',
        upgrade: 'Mejorar',
        upgradeNow: 'Comprar espacio',
        uploadFiles: 'Subir archivos',
        uploadFromCameraRoll: 'Subir desde la galería',
        takeAPhotoAnUpload: 'Tomar una foto y subir',
        newFolder: 'Nueva carpeta',
        changePlan: 'Cambiar plan',
        select: 'Seleccionar',
        selectAll: 'Seleccionar todo',
        info: 'Información',
        shareWithLink: 'Compartir enlace',
        download: 'Descargar',
        moveToThrash: 'Mover a la papelera',
        copyLink: 'Copiar enlace',
        startSyncingPhotos: 'Sincronizar mis fotos',
        syncNow: 'Sincronizar ahora',
        tryAgain: 'Intentar de nuevo',
        subscribe: 'Suscribirse',
        invite: 'Invitar',
        grant: 'Autorizar',
        dismiss: 'Cerrar',
      },
      inputs: {
        email: 'Correo electrónico',
        newPassword: 'Nueva contraseña',
        password: 'Contraseña',
        confirm_password: 'Confirmar contraseña',
        first_name: 'Nombre',
        last_name: 'Primer apellido',
        searchInRecents: 'Buscar en recientes',
        searchInShared: 'Buscar en compartido',
      },
      FileList: {
        noResults: {
          title: 'Sin resultados',
          message: 'Ningún elemento en esta carpeta coincide con esta búsqueda',
        },
      },
      empty_folder: {
        title: '¡Esto parece vacío!',
        subtitle: 'Aprieta en el botón de subida para empezar.',
      },
      app_menu: {
        search_box: 'Buscar',
        filter: {
          date: 'Fecha de subida',
          size: 'Tamaño',
          name: 'Nombre',
          type: 'Tipo de archivo',
        },
        settings: {
          storage: 'Almacenamiento',
          more: 'Más información',
          drive: 'Drive',
          contact: 'Soporte',
          signOut: 'Cerrar sesión',
        },
      },
      file_and_folder_options: {
        styling: 'Color de la carpeta',
        icons: 'Icono',
        type: 'Tipo: ',
        added: 'Añadido: ',
        size: 'Tamaño: ',
        move: 'Mover',
        share: 'Compartir',
        delete: 'Borrar',
        view: 'Ver',
      },
      ReferralsBanner: {
        message: 'Obtén hasta 10GB gratis',
      },
    },
    modals: {
      UploadModal: {},
      MoveModal: {
        title: 'Selecciona una carpeta a la que mover el archivo.',
      },
      ShareModal: {
        title: 'Compartir archivo de Internxt Drive',
        message: '{0}',
        share: 'Compartir',
        copy: 'Copiar',
        loading: 'Cargando link...',
      },
      delete_modal: {
        title: '¿Borrar completamente?',
        subtitle: 'Por favor, confirma que realmente quieres borrar este objeto. Esta acción no puede deshacerse.',
        warning: 'Esta acción no puede deshacerse',
        delete: 'Borrar',
      },
      out_of_space_modal: {
        title: 'No tienes más espacio',
        subtitle:
          'Actualmente has usado 10GB de almaceniamiento. Para seguir subiendo más archivos, por favor, mejora tu plan de almacenamiento.',
      },
      coming_soon_modal: {
        title: '¡Próximamente!',
        subtitle: 'Nuestros fantásticos programadores están trabajando en ello, así que mantente al tanto!',
        got_it: 'Entendido!',
      },
      deletePhotosModal: {
        title: 'Mover foto/s a la papelera',
        message:
          'Las fotos no se borrarán de tu dispositivo. Además, las fotos se mantendrán en la papelera hasta que la vacíes.',
      },
      photos_preview_info_modal: {
        options: {
          name: 'Nombre',
          uploaded: 'Fecha de subida',
          modified: 'Fecha de modificación',
          size: 'Tamaño',
          dimensions: 'Dimensiones',
          format: 'Formato',
        },
      },
      share_photo_modal: {
        nativeMesage: '¡Echa un vistazo a esta foto!',
        linkOpenLimit: 'Límite de veces abierto',
        decrypting: 'Desencriptando imagen {0}%',
        photoReady: '¡Tu foto está lista!',
        shareWithYourContacts: 'Comparte la foto con tus contactos',
      },
      link_copied_modal: {
        message: 'Enlace copiado al portapapeles',
      },
      run_out_of_storage: {
        advice:
          'Mejora tu plan o borra los archivos que no vayas a usar para subir o sincronizar tus archivos de nuevo.',
      },
      InviteFriendsModal: {
        title: 'Invite a un amigo',
        message:
          'Obtén hasta 4GB de almacenamiento extra gratis invitando a tus amigos (1GB por usuario registrado a través de tu invitación)',
      },
      NewsletterModal: {
        title: 'Suscríbete a nuestra newsletter',
        message: 'Recibe las últimas novedades y actualizaciones en tu bandeja de entrada',
      },
    },
    messages: {
      folderCreated: 'Carpeta creada',
      itemsDeleted: 'Elementos borrados',
      photoShared: '¡Has compartido una foto!',
      photosSyncPending: 'Sincronización pendiente',
      photosSyncCompleted: 'Tu dispositivo está sincronizado',
      renamedSuccessfully: 'Renombrado correctamente',
      linkCopied: 'Enlace copiado',
      passwordChanged: 'Contraseña cambiada',
    },
    errors: {
      generic: {
        title: 'Ha habido un error',
        message: '{0}. Por favor, contacta con nosotros.',
      },
      unknown: 'Error desconocido',
      uploadFile: 'Error al subir archivo: {0}',
      storageLimitReached: 'Has alcanzado tu límite de almacenamiento',
      photosInitialize: 'Error al iniciar Photos: {0}',
      photoShared: 'Ha habido un error al compartir la foto',
      photosSync: 'Error sincronizando fotos: {0}',
      photosLoad: 'Error cargando fotos: {0}',
      photosDelete: 'Error eliminando foto/s: {0}',
      photosFullSizeLoad: 'Error cargando foto a tamaño completo: {0}',
      fetchReferrals: 'Error cargando referidos: {0}',
      inviteAFriend: 'Error enviando invitación: {0}',
      subscribeToNewsletter: 'Error al suscribirse al newsletter: {0}',
      loadProducts: 'Error al cargar productos: {0}',
    },
  },
});

export default strings;
